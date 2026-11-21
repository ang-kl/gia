---
flow: spec
title: "A place set in chat opens the Cuisine app on that place, on every phone; the nearby-eateries line shows bold text, not tags"
act: "directive"
force: "MUST"
scope:
  - "i18n.js"
  - "index.js"
  - "location-cache.js"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "web/cuisine/src/v2/lib/launch-anchor.js"
  - "scripts/cuisine-deeplink-boot.mjs"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-15-chat-place-opens-cuisine-and-bold-tag.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# A place set in chat opens the Cuisine app on that place, on every phone; the nearby-eateries line shows bold text, not tags

Version: 0.1. Date: 15 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception, `[AMD-242]`).

## Intent
- Outcome: (1) after a place is set in chat (`/l <place>`, the picker, a shared pin, a recent place), the Cuisine app
  opens on that place, loads its first results there and shows the place's name, on whichever phone opens it, and
  nothing automatic moves it to the phone's position while the place is locked (six hours); (2) the chat line
  "Slim pickings at … here are the top-rated eateries nearby" shows the place in bold, not the characters `<b>`.
- Force: MUST. Operator, 15-11 '26, with two screenshots: *"1. There is styling `<b>` in the telegram text 2. I set :
  /l Hyatt Place Johor Bahru Paradigm Mall But it still falls back to current location … I tried second time … I open
  cuisine TMA, it doesn't run the first 12 around the 'Hyatt Place Johor Bahru Paradigm Mall'"*.
- Done when: the tests below prove each invariant (each red on v0.62.986 first), the full suite, the seven builds and
  the render checks are green, and CI is green on the pull request.

## Interpretation
- UNDERSTANDING (measured 15-11 '26 before writing this):
  - **The `<b>` line.** `place.autoNearbyIntro` (`i18n.js:516-525`, nine locales) wraps the sentence in Markdown
    underscores and the place name in HTML `<b>`, and `index.js:12394` sends it with `parse_mode: 'Markdown'`. Telegram
    applies the italics and prints the tags. It is the only string in `i18n.js` that mixes the two styles (a scan of
    every string literal in the file found these nine and no other). The place name is already HTML-escaped there.
  - **The server did search the Hyatt.** Production log, 12:55 and 12:56 SGT: each open of the app sent one search
    centred on the hotel, region OTHER, and six venues were returned. The results were lost in the app.
  - **Cause in the app, reproduced.** The built v0.62.986 Cuisine app was booted in a headless browser with the chat
    link (`#lat=…&lng=…&region=OTHER`), a stubbed server and a synthetic phone position in Singapore. It (a) takes the
    place from the link and searches there; (b) rewrites its own address after the first paint and drops `lat`/`lng`
    (`writeToHash`, `lib/state.js:234-259`); (c) re-reads the link from that address on every render
    (`App.jsx:993`), so the start-up location check's "this is a chat link, skip" guard (`App.jsx:2713-2717`) is
    false by the time it runs; the check takes the phone's position, sets region SG and the anchor "Singapore", and
    sends an automatic save (the production log shows exactly that save, refused by the server's guard); (d) the
    anchor-and-phone check then sees two countries, stops the first load and discards the results that came back
    (console: *"boot search returned but saved≠device → discarding results"*). Screen: no cards, "Singapore".
    **Controlled experiment:** the same boot with `lat`/`lng` kept in the address skips the check and shows the six
    cards on the Johor place, under each of four server answers.
  - **Cause on the server, reproduced.** `/l` writes the account's record only (`setUserLocation` without a device id,
    `location-cache.js:53-162`). A phone reads its own slot first (`getUserLocation`, `:164-182`). The phone's slot
    held an older Singapore record, so `/api/cuisine/user-location` answered with that: the app applied region SG to a
    Johor place and read the lock as off. With a fake Redis: the account read is the place, locked; the phone's read
    is its own old record, unlocked. Even with the app fixed, this alone puts the 🇸🇬 flag over the Johor place.
  - **The save of the phone's position at 12:55:47** (a deliberate pick, with a chat notice) has no automatic source
    in the reproduction over 28 seconds; the empty screen shows the 📍 Current button, so it was most likely a tap.
    This is inference, not proven, and the fix does not depend on it.
  - **Indonesian only.** Both searches carried `cuisines: ["indonesian"]`: the reader's kept cuisine filter (kept
    settings, v0.62.959, 30-10 '26). 13 such places lay within 5 km and six were returned first.
  - **What changes.** (1) The nine strings use `<i>…<b>{place}</b>…</i>` and are sent as HTML. (2) The chat link also
    carries the place's name. (3) The app reads the link once per page load and keeps it; a chat-link open is a
    deliberate, locked pick from the first render, named, so the start-up check, the 20-second follow and the
    return-to-app refresh leave it alone; the server's answer no longer overrides the link's own region or lock.
    (4) A record written from chat is marked as such, and a phone's read returns it when it is newer than that
    phone's own slot.
  - Approving this spec accepts this UNDERSTANDING as well as the table below.
- GAPS: none after the operator's answers of 15-11 '26.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| D1 | For a place set under six hours ago, the Cuisine app opens on the place, loads the first results there and shows the place's name; nothing automatic moves it; only a tap (📍 Current or a new pick) does | confirmed | Operator, 15-11 '26: *"Set place wins (Recommended)"* |
| D2 | A place set in chat (`/l`, the picker, a shared pin, a recent place) is what every phone opens on next, until that phone picks another place inside an app. A place picked in an app on one phone stays that phone's. The rule lives in the shared server read, so every Mini App that reads the saved place follows it | confirmed | Operator, 15-11 '26: *"Chat place reaches every phone (Recommended)"* |
| D3 | The kept cuisine and filters still apply to the first load on a new place; nothing about kept settings changes | confirmed | Operator, 15-11 '26: *"Keep my filters (Recommended)"* |
| D4 | The `<b>` line is corrected in all nine languages with a guard test, and the chat `/cuisine` link carries the place's name | confirmed | Named in the delivery question; operator, 15-11 '26: *"Fix first, merge when green (Recommended)"* |
| D5 | v0.62.987, its own pull request on `claude/handover-july-11-49uzvf`, ahead of the airports work (then v0.62.988) and the Simulate and bus work (then v0.62.989); it carries the held `[AMD-338]`; Claude Code merges once CI is green | confirmed | Operator, 15-11 '26: *"Fix first, merge when green (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| K1 | The nearby-eateries line reaches Telegram as valid HTML with the place in bold, in nine languages | `i18n.js`, the one send site | this message | tag characters on screen; Markdown and HTML mixed in one string | `auto-nearby-intro-html.test.js`: each locale has `<i>` and `<b>{place}</b>` and no underscore wrapper; the send site sends HTML; no `i18n.js` string mixes a Markdown wrapper with an HTML tag |
| K2 | A chat-link open ends on the place: one search at the place, its cards on screen, the place's name on screen, the link's region kept, and no save request for 25 seconds, whatever the server's read answers | the built Cuisine app | chat links carrying a place | the phone's position taking over; results discarded; a 🇸🇬 flag over a Johor place | `scripts/cuisine-deeplink-boot.mjs` (headless, four server answers), run by `npm run test:render` in CI's build job; red on v0.62.986 |
| K3 | A place set in chat is what a phone with an older slot reads, locked; a later pick in an app on that phone wins again; another phone's pick never reaches this phone; an automatic unnamed write never wins | `location-cache.js` | account and device records | the chat place invisible to the phone (today); per-phone places leaking between phones | `chat-place-reaches-devices.test.js` with the fake Redis |
| K4 | The chat `/cuisine` link carries the place's name; explicit `@location` arguments still win | `index.js` | a locked saved place | a link without the name; an argument overridden | `chat-place-reaches-devices.test.js` calls the handler with a fake bot |
| K5 | The six-hour rules of 02-11 '26 still hold (lock, 50 km switch, follow, server guard, "↩ Back to", chat line) | Cuisine, Menu, server | none | a regression of v0.62.965 | `anchor-age.test.js`, `location-follow.test.js`, `saved-place-expiry.test.js` pass; any edit to them is quoted in the Journal under F7 |
| K6 | Kept settings are untouched | `kept-settings.js` and its callers | none | a new place clearing the reader's filters | the kept-settings tests pass unedited; no edit to `web/_shared/lib/kept-settings.js` |
| K7 | Full suite, seven builds and both render checks green | repo | none | a broken app | `npm test`; `npm run build`; `npm run test:render` |

## Acceptance criteria
- [ ] Nine strings as HTML, sent as HTML, guard test red first → K1
- [ ] Link read once and kept; chat-link open is a deliberate locked pick; server answer cannot override the link's region or lock → K2
- [ ] Chat writes marked; a phone's read prefers a newer chat record → K3
- [ ] `/cuisine` link carries `place=` → K4
- [ ] Existing six-hour and kept-settings tests pass; changed tests quoted (F7) → K5, K6
- [ ] Headless chat-link check added to `npm run test:render` → K2, K7

## Out of scope
- The Menu, Hawker and Train apps' own start-up code (they gain the server rule of D2 and nothing else).
- Travel times: production has logged `[travel-times] … matrix failed: HTTP 403` on searches since at least 05-11 '26.
  A separate fault, reported to the operator, not fixed here.
- The two older endpoints that save an unnamed position for the account (`/api/cuisine-search`,
  `/api/surprise-search`); no Mini App source calls them today.
- Airports (`2026-11-12-fr24-city-airports-all-maps-user-caps`) and Simulate and buses
  (`2026-11-12-remove-simulate-smooth-buses-shared-route`).

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
