---
flow: spec
title: "Quick / AI lever on the Tell-me bar, AI route honours place and 'new', chat questions go to the AI"
act: "directive"
force: "MUST"
scope:
  - "index.js"
  - "nl-anchor.js"
  - "newness-filter.js"
  - "tell-gia-rate-limit.js"
  - "web/cuisine/src/v2/components/TellMePanel.jsx"
  - "web/cuisine/src/v2/components/Icon.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/i18n.js"
  - "web/cuisine/src/styles.css"
  - "__tests__/nl-anchor.test.js"
  - "__tests__/newness-filter.test.js"
  - "__tests__/tell-gia-rate-limit.test.js"
  - "__tests__/chat-question-to-ai.test.js"
  - "__tests__/tellme-ai-lever.test.js"
  - "__tests__/freetext-classify.test.js"
  - "__tests__/taste-suggest.test.js"
  - "__tests__/tma-i18n-coverage.test.js"
  - "__tests__/tma-i18n-korean.test.js"
  - "package.json"
  - "doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# Quick / AI lever, AI route honours place and "new", chat questions go to the AI

Version: 0.1. Date: 25 October 2026 (Asia/Singapore).
Location: `doc/Feature/`, a one-time exception the operator granted on 24-10 '26 21:47 SGT (F5 alert;
answer "doc/Feature, one-time"). `CLAUDE.md` still names `doc/Spec` as the home; the three protected
flow files still name `doc/Feature`.

## Intent
- Outcome: the operator's sentence "What are the new eateries at Raffles City" returns newly opened
  places within 1.5 km of Raffles City, both in the Cuisine Mini App (AI position) and in the bot chat;
  and the Mini App's Tell-me bar gains a tiny Quick / AI lever that chooses between the no-AI search
  and the AI reading.
- Force: MUST. Operator, 25-10 '26 07:05 SGT, verbatim: *"build the switch, fix the AI route + bot
  chat"*, with the two fix bullets quoted under Interpretation.
- Done when: the acceptance tests below pass, the full suite and all five Vite builds are green, and
  every invariant reports Passed or is named Not Verifiable with the reason.

## Interpretation
- UNDERSTANDING:
  - **Evidence that set the scope.** The operator's live test on 25-10 '26 (Mini App, AI path) returned
    12 places spread from Lengkok Bahru to Sentosa and HarbourFront, including long-established
    Michelin restaurants. Code reading explains both: `/api/cuisine/nl-query` calls
    `pipeline.discover` with `radius: 50000` whether or not a place was named
    (`index.js` ~18731), and it never applies the shared newness rule; "new" only adds the words
    "newly opened" to the Google query.
  - **Fix 1, AI route (operator verbatim):** *"When the AI names a place, search within 1.5 km of it
    (same as the normal search) and show the place pill; when it infers 'new', apply the same newness
    rule as the New filter."* 1.5 km is `place-detector.js` `NEARBY_RADIUS_M = 1500`. "The same
    newness rule" is the block inside `/api/cuisine/search` (`index.js` ~17389-17440): per-venue
    Places details for the oldest review, `newness-criteria.passesNewness`, the never-empty floor
    `pool-floor.demoteNeverEmpty`, and the `noProvenNew` flag. It is extracted into one shared
    function so both routes run the identical code; `/api/cuisine/search` behaviour does not change.
  - **Fix 2, bot chat (operator verbatim):** *"a sentence its question guard declines is passed to the
    same AI reading instead of the 🍛 reply."* The guard is `looksLikeQuestion` at `index.js` ~11574
    only. "The same AI reading" is `tell-gia.inferTellGia` (the AI route's reader), followed by the
    same anchor and newness rules, delivered through the chat's existing `deliverPicks`.
  - **The lever:** the design approved in mockup on 24-10 '26: an 8x12 px flat toggle bat growing out
    of a bump in the bar's top border, just right of the left corner curve; 40x40 px invisible tap
    area. OFF/Quick: lever leans left, slate-600 (light) or the bar's yellow-400 (dark), each with a
    thin contrasting outline (white / near-black) so map tiles cannot swallow it. ON/AI: leans right,
    violet, the bar border becomes a violet-to-pink gradient, the 🔍 becomes a line-art robot, the
    placeholder becomes "Ask anything, e.g. new eateries at Raffles City". The bump always matches the
    border colour.
  - **Default and memory (operator answers, 25-10 '26):** Quick by default; reset to Quick on every
    Mini App open.
  - **Behaviour change this makes, stated plainly:** today typed text plus 🔍 goes to the AI route.
    With Quick as the default, typed text plus 🔍 goes to the normal search (`runSearch` with the text
    as `freeText`), which has the question guard. A user must flip the lever to get the AI.
  - **Cost cap (operator answer):** chat questions share the Mini App's existing 60 AI calls per user
    per hour counter (`tell-gia:rl:<id>:<hour>`); past the cap, chat falls back to today's 🍛 reply.
- GAPS:
  - G1: the AI route's place is still accepted only inside Singapore or Johor Bahru (bbox + 120 km
    check). A user abroad who names a local place keeps today's behaviour. Out of scope; recorded.
  - G2: the chat's second decline (`classifySearchIntent` → `ambiguous`, `index.js` ~11762) is not
    the question guard and is left unchanged.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | Lever default is Quick (no AI); flipping to AI sends text to `/api/cuisine/nl-query` as today. | confirmed | Operator 25-10 '26: "Quick by default". |
| A2 | The lever resets to Quick on every Mini App open; nothing is stored. | confirmed | Operator 25-10 '26: "Reset each visit". |
| A3 | Chat questions share the 60/hour per-user AI counter; past the cap the 🍛 reply is sent. | confirmed | Operator 25-10 '26: "Share the 60/hour cap". |
| A4 | "Within 1.5 km" means `radius: 1500` around the geocoded place, used only when a place resolves; with no place the AI route keeps its current radius. | confirmed | Inferred from "same as the normal search"; operator confirmed A4-A8 together, 25-10 '26. |
| A5 | "The same newness rule" means extracting the `/api/cuisine/search` New block into `newness-filter.js` and calling it from both routes; `/search` results must be byte-identical before and after. | confirmed | Operator, 25-10 '26. |
| A6 | Chat delivery: a short "📍 Near <place>" line (the chat's equivalent of the pill) then the existing `deliverPicks` cards; with no place and no saved location, the chat asks for a location as the voice path does. | confirmed | Operator, 25-10 '26. |
| A7 | Out of scope: G1 (foreign places), G2 (second chat decline), the bot chat gets no lever. | confirmed | Operator, 25-10 '26. |
| A8 | Version 0.62.941, one PR, carrying the held merge record for #1878. | confirmed | Operator, 25-10 '26. |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A place the AI names narrows the AI search to 1.5 km around it and returns a `placeAnchor`. | `/api/cuisine/nl-query`, chat question path | No place named, or place rejected by the SG/JB check: current radius, no anchor | 50 km search that only moves the centre | `__tests__/nl-anchor.test.js` |
| I2 | When "new" is inferred, both routes apply one shared newness function; `/api/cuisine/search` output is unchanged by the extraction. | `newness-filter.js`, both routes | New not inferred: function not called | Two copies of the rule drifting; `/search` regression | `__tests__/newness-filter.test.js` + existing New-filter suites green |
| I3 | Only the question guard's declines go to the AI in chat; everything else in the chat free-text flow is unchanged. | chat free-text handler | Over the hourly cap: 🍛 reply | Paid calls on greetings, transport or non-question text | `__tests__/chat-question-to-ai.test.js` |
| I4 | One hourly counter governs AI calls from the Mini App and the chat. | `tell-gia-rate-limit.js` | Redis unavailable: allow (current behaviour) | Two counters, doubling the real cap | `__tests__/tell-gia-rate-limit.test.js` |
| I5 | Lever starts at Quick on every open; Quick sends typed text to the normal search; AI sends it to the AI route. | Tell-me bar | Empty text: 🔍 runs the criteria search in either position | Paid call without the user choosing AI | `__tests__/tellme-ai-lever.test.js` |
| I6 | In AI position the border, button icon, placeholder and switch state all change together, in all nine locales. | Tell-me bar | none | A half-switched bar that misreports the mode | `__tests__/tellme-ai-lever.test.js` |
| I7 | Pre-PR gates: `node --check` on each changed `.js`, full suite green, five Vite builds green, version bumped. | repo | none | Shipping a broken render path | `npm test -- --run`, `npm run build` |

## Acceptance criteria
- [ ] AI route, place named and resolved → `discover` called with `radius: 1500` at the place, response carries `placeAnchor {name, lat, lng}` → `nl-anchor.test.js`
- [ ] AI route, no place → radius unchanged, no anchor → `nl-anchor.test.js`
- [ ] AI route, "new" inferred → shared newness function runs, an established venue (high review count) is refuted, `noProvenNew` set when nothing is provably new → `newness-filter.test.js`
- [ ] `/api/cuisine/search` New block calls the shared function; a recorded fixture produces identical output to the pre-extraction code → `newness-filter.test.js`
- [ ] Mini App: AI response with `placeAnchor` shows the place pill → `tellme-ai-lever.test.js`
- [ ] Chat: "What are the new eateries at Raffles City" no longer gets the 🍛 reply; it reaches `inferTellGia`, then the anchor and newness rules, then `deliverPicks` → `chat-question-to-ai.test.js`
- [ ] Chat: over the shared cap → 🍛 reply, no AI call → `chat-question-to-ai.test.js`
- [ ] Chat: "hi", "MRT to Bugis", a dish name → behaviour unchanged → `chat-question-to-ai.test.js`
- [ ] Lever: opens at Quick; Quick + text → `runSearch` with `freeText`; AI + text → `nlQuery`; aria `role="switch"` + `aria-checked` → `tellme-ai-lever.test.js`
- [ ] Lever: robot icon in `Icon.jsx`; new strings present in all nine locales → `tellme-ai-lever.test.js`
- [ ] `freetext-classify.test.js` assertions unchanged (the guard itself is not altered) → existing suite

## Out of scope
- Foreign-country places in the AI route (G1).
- The chat's `ambiguous` decline (G2).
- A lever in the bot chat.
- Persisting the lever between visits.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.

## Amendment 0.2 — 25-10 '26 08:15 SGT · three pinned counts (F3 + F7)

Prior scope, quoted verbatim (AU-7): the `scope:` list ended
`"__tests__/freetext-classify.test.js"`, `"package.json"`, then the doc paths.

Appended: `__tests__/taste-suggest.test.js`, `__tests__/tma-i18n-coverage.test.js`,
`__tests__/tma-i18n-korean.test.js`.

Why. After implementation the full suite showed 4 failures in those three files, all of them
pinned totals this work moves on purpose, with the property each pin guards still holding:

| File | Pin | Was | Now | Why it moved | Property still true |
|------|-----|-----|-----|--------------|---------------------|
| `taste-suggest.test.js` | `await deliverPicks(` call sites | 14 | 15 | the chat question path delivers its results | the new call passes `{ lang }`; the locale is still resolved inside `deliverPicks` before the empty branch |
| `tma-i18n-coverage.test.js` | cuisine base keys | 401 | 404 | `tellme.placeholderAi`, `tell.askAiCta`, `tell.leverAria` | every key has all nine locales (`tellme-ai-lever.test.js`) |
| `tma-i18n-korean.test.js` | cuisine base keys / keys with Korean | 401 | 404 | the same three keys | all three carry Korean |

Only the numbers change; no assertion is loosened. Operator chose this, 25-10 '26: "(a) Amend
scope, re-approve". This amendment voids the 07:17 approval; a fresh `APPROVE` is required.
