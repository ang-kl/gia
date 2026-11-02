---
flow: spec
title: "A place set on purpose stays locked for 6 hours; after that the phone wins, with a one-tap way back"
act: "directive"
force: "MUST"
scope:
  - "location-cache.js"
  - "index.js"
  - "i18n.js"
  - "web/_shared/lib/anchor-age.js"
  - "web/_shared/lib/anchor-age-i18n.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/location-follow.js"
  - "web/menu/src/App.jsx"
  - "__tests__/anchor-age.test.js"
  - "__tests__/location-follow.test.js"
  - "__tests__/saved-place-expiry.test.js"
  - "package.json"
  - "doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# A place set on purpose stays locked for 6 hours; after that the phone wins, with a one-tap way back

Version: 0.1. Date: 2 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.965**.

## Intent
- Outcome:
  - A place the user set on purpose (chat `/location`, a Menu pick, a Cuisine pick) stays locked for **6 hours**.
  - After 6 hours, when Cuisine or Menu opens and the phone is **more than 50 km** away, the app searches where the
    phone is and shows a chip **"↩ Back to Kyoto"** (the old place's name) that restores it in one tap.
  - The chat `/cuisine` reply says which place it is using and how old it is, and no longer sends a place older
    than 6 hours into the app link.
  - One rule, kept on the server, so Menu, Cuisine and the chat agree.
- Force: MUST.
  - Operator, 02-11 '26, screenshot of `/cuisine` opening on yesterday's Kyoto from Singapore: *"recurring issue (many
    times) about current device location place last search in cuisine tma … can you propose a resolution"*.
  - Operator, 02-11 '26, on the proposal: *"Yes to this shape (one server rule, 6 hours, 50 km, Cuisine + Menu + chat
    /cuisine"* and *"The 'Back to Kyoto' chip: in"*.
  - Operator, 02-11 '26, choosing between stated options: *"Yes, supersede after 6 h (Recommended)"* (see C6).
- Done when:
  - the three new or extended test files pass;
  - the suite is green and Cuisine and Menu build;
  - a headless render of the built Cuisine app, with a Kyoto place saved 19 hours ago and the phone in Singapore,
    searches Singapore and shows the chip; tapping it restores Kyoto;
  - the same render with Kyoto saved 10 minutes ago keeps Kyoto;
  - the operator's own phone check on production (acceptance criterion below).

## Interpretation
- UNDERSTANDING (measured 02-11, read-only):
  - **One saved place.** Menu and Cuisine both read the same server record through `/api/cuisine/user-location`
    (`index.js:15349`), which `location-cache.js:91` stamps with `setAt`. Hawker reads the phone only for its weather
    chip; Train reads no location. So the rule touches two apps and the chat, not every Mini App.
  - **Why Kyoto wins today.** A saved place with a `label` is treated as a deliberate pick on every start:
    - Cuisine latches it (`App.jsx:1837`) and then skips its own device check (`App.jsx:2698`) and its 20-second
      follow (`location-follow.js:58-59`);
    - Menu skips its auto-detect for the same reason (`web/menu/src/App.jsx:414`) and, beyond 50 km, shows the hint
      "📍 You seem far from {label}" (`:420`, `loc.farFromPick`);
    - the server refuses an automatic ("ambient") write over any labelled place (`location-cache.js:69-79`, the D787
      guard), so even a device write would be dropped.
    - None of these asks how old the pick is. The only age limit is 24 hours (`index.js:1716`, `:14960`).
  - **The chat asks too late.** After 6 hours idle the bot sends "Welcome back … share your current location" and, in
    the same handler, the `/cuisine` reply whose button already carries Kyoto (`index.js:11495-11496`, `:1740-1759`).
  - **6 hours** is the chat's existing new-visit gap (`IDLE_WAKE_MS`, `index.js:2152`). **50 km** is Menu's existing
    "genuine travel, not the daily SG↔JB hop" threshold (`web/menu/src/App.jsx:420`).
  - **String pins.** Menu's `i18n.js` is pinned at 80 base keys and Cuisine's at 410 (`tma-i18n-korean.test.js:45`),
    so the chip's strings go in a separate shared table, as `FREETEXT_STRINGS` did (v0.62.964). The bot's `i18n.js`
    has no count pin, so the chat line is a new key there.
  - **Nothing in `__tests__/` covers** the `/cuisine` deep link, Menu's auto-detect or the D787 guard today.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **The server states the age.** `/api/cuisine/user-location` adds `ageMinutes` and `locked` (true while a
    labelled place is under 6 hours old). Both apps read `locked` instead of deciding from `label` alone.
  - C2 — **The lock is the only thing that changes in the apps.** Cuisine's latch (`App.jsx:1837`) and Menu's skip
    (`:414`) become "labelled **and** locked". Everything downstream is existing code: Cuisine's device check and
    20-second follow, Menu's auto-detect. No new location prompts.
  - C3 — **The server guard respects the same clock.** The D787 guard keeps refusing an automatic write over a locked
    place, and lets it through once the place is unlocked. Otherwise the apps would switch on screen and the server
    would keep Kyoto, and the next open would jump back.
  - C4 — **"↩ Back to {place}".** When an app switches away from an unlocked place, it keeps that place's name,
    coordinates, region and country and shows a chip above the location field for the rest of that open. Tapping it
    saves the place again as a deliberate pick (a fresh 6-hour lock) and searches it. The chip is not shown when the
    phone is within 50 km, when the location is unavailable, or when the saved place has no name.
  - C5 — **Chat `/cuisine`.** The link carries the saved place only while it is locked (the 24-hour window at
    `index.js:1716` becomes the same 6-hour lock). The reply line becomes "📍 Anchored to **Kyoto**, set yesterday
    4:10 PM" (name and time; "today 10:55 AM" when same-day), in the bot's locales. Outside the lock the line says
    the app will use the phone.
  - C6 — **Supersedes "hint, never auto" after 6 hours.** v0.62.31 (operator: *"hint, never auto"*) made Menu show a
    hint and keep the place. From this version that holds only **inside** the lock; after it, Menu switches and
    offers the chip, the same as Cuisine. Operator, 02-11 '26: *"Yes, supersede after 6 h (Recommended)"*.
  - C7 — **The 50 km test uses the phone reading each app already takes** (Telegram's LocationManager, then
    `navigator.geolocation`). If neither answers, the app keeps the saved place, locked or not.
  - C8 — **Recent locations are unchanged.** A switch to the phone writes an automatic (label-less) place, which the
    recent-locations list already ignores; the chip's restore writes a labelled one, which it already records.
  - C9 — **The decision is a pure function**, `web/_shared/lib/anchor-age.js`: `isLocked({ label, setAt, now })`,
    `shouldSwitchToDevice({ saved, device, now })`, `describeAge(setAt, now, lang)`. Both apps, the bot and the tests
    call the same code. `location-follow.js` gains a `locked` input beside `explicitPick`.
- GAPS: none that change the outcome given C1-C9. Whether Telegram returns the phone's location on a cold open is
  a device fact (A1).

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | On the operator's phone, Cuisine and Menu get a device location on opening without a new permission prompt (it was granted for v0.62.964's and earlier checks) | confirmed | Operator, 02-11 '26 screenshot: the chat's "Share my current location" button answered with Downtown Core at 10:55 AM, and Cuisine's start-up device check has run since v0.61.242. If a cold open gets no reading, C7 keeps the saved place and nothing switches |
| A2 | A place older than 6 hours losing its lock is acceptable even while the user is planning a trip from home; the chip is the way back | confirmed | Operator, 02-11 '26: *"Yes to this shape (one server rule, 6 hours, 50 km …"* after the trade-off was stated in № 4,405 §C |
| A3 | Menu's "hint, never auto" rule (v0.62.31) is superseded after the lock | confirmed | Operator, 02-11 '26: *"Yes, supersede after 6 h (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A labelled place is locked for 6 hours from `setAt`, then not; an unlabelled place is never locked | `anchor-age.js`, the server response | none | a lock that never expires (today's bug) or one that expires early | `anchor-age.test.js`; `saved-place-expiry.test.js` calls the route handler |
| I2 | The app switches to the phone only when the place is unlocked **and** the phone is over 50 km away **and** a reading exists | `anchor-age.js`, both apps | none | a switch at 5 km, or on a missing reading | `anchor-age.test.js`: Kyoto 19 h / phone SG → switch; Kyoto 10 min → keep; 5 km → keep; no reading → keep |
| I3 | A locked place still wins over the 20-second follow and the start-up check (the Wellington and KL cases of v0.61.372 and v0.61.430) | `location-follow.js`, `App.jsx` | none | a regression of the country-drift bug | `location-follow.test.js` extended with `locked`; its 14 existing tests pass unedited |
| I4 | The server refuses an automatic write over a locked place and accepts one over an unlocked place | `location-cache.js` | deliberate writes are unchanged | the apps switching while the server keeps Kyoto | `saved-place-expiry.test.js` with a fake Redis, both ages |
| I5 | After a switch, the chip names the old place and tapping it restores it as a fresh deliberate pick | both apps | no chip within 50 km, with no reading, or for an unnamed place | a way back that is not there, or that does not re-lock | `saved-place-expiry.test.js` (rendered with the stub-React harness); the headless render |
| I6 | The chat `/cuisine` link carries the saved place only while locked, and the reply names the place and its age | `index.js` | explicit `@location` arguments still win | the button opening the app on yesterday's place | `saved-place-expiry.test.js` calls the handler with a fake bot |
| I7 | The chip's strings exist in the 9 Mini App locales and the chat line in the bot's locales; Menu's and Cuisine's `i18n.js` untouched | `anchor-age-i18n.js`, `i18n.js` | none | an English fallback, or a broken key pin | `anchor-age.test.js`; `tma-i18n-korean` and `tma-i18n-coverage` pass unedited |
| I8 | Hawker, Train and every other surface are unchanged; the suite passes; Cuisine and Menu build | suite, builds | none | a broken app | `npm test`; `vite build` for both |

## Acceptance criteria
- [ ] Tests written first and red → I1-I7
- [ ] `anchor-age.js`, the server fields, the guard, both apps' lock condition, the chip, the chat line → I1-I7
- [ ] Mutations, each proved applied and restored, all caught:
  - the lock made permanent (age ignored);
  - the 50 km threshold dropped to 0;
  - the guard made to refuse regardless of age;
  - the chip's restore made to write without a label;
  - the chat link made to carry a stale place;
  - a locale string dropped.
- [ ] Headless render of the built Cuisine app: Kyoto saved 19 hours ago and the phone in Singapore → searches
      Singapore with the chip; tapping it restores Kyoto; Kyoto saved 10 minutes ago → keeps Kyoto
- [ ] Full suite green; Cuisine and Menu build; `package.json` bumped to 0.62.965
- [ ] The operator opens Cuisine and Menu on production the morning after setting a place abroad

## Out of scope
- Hawker and Train (they do not read the saved place).
- Asking before switching (a prompt card); the operator chose the automatic switch with a way back.
- Changing the chat's 6-hour "welcome back" flow itself, beyond the `/cuisine` reply line.
- Any new location permission prompt.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
