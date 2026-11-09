---
flow: spec
title: "Train, Hawker and Cuisine: 🚇 and 🚍 footer buttons open a drawer of up to 5 stations and 5 stops; nothing moves outside service hours, and the header says when it resumes"
act: "directive"
force: "MUST"
scope:
  - "transport.js"
  - "index.js"
  - "web/transport/src/lib/train-sim.js"
  - "web/transport/src/lib/stop-buses.js"
  - "web/transport/src/lib/bus-route.js"
  - "web/transport/src/lib/run-state.js"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/App.jsx"
  - "web/_shared/lib/station-sim-controller.js"
  - "web/_shared/lib/run-state.js"
  - "web/_shared/components/FooterRunButtons.jsx"
  - "web/_shared/components/RunDrawer.jsx"
  - "web/_shared/components/ResumeStrip.jsx"
  - "web/_shared/components/FooterRunChips.jsx"
  - "web/hawker/src/components/HawkerMapPanel.jsx"
  - "web/cuisine/src/v2/components/MapPanel.jsx"
  - "web/hawker/src/App.jsx"
  - "web/cuisine/src/v2/App.jsx"
  - "web/cuisine/src/v2/lib/state.js"
  - "web/transport/src/i18n.js"
  - "web/hawker/src/i18n.js"
  - "web/menu/src/i18n.js"
  - "web/clipboard/src/lib/i18n.js"
  - "__tests__/run-drawer.test.js"
  - "__tests__/station-sim.test.js"
  - "__tests__/stop-buses.test.js"
  - "__tests__/hawker-cuisine-run.test.js"
  - "__tests__/locale-restore-coherence.test.js"
  - "package.json"
  - "doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# The run drawer, and nothing moving outside service hours

Version: 0.1. Date: 4 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.971**, in the Train, Hawker and Cuisine Mini Apps together.

## Intent
- Outcome:
  - The footer row that v0.62.969 and v0.62.970 added for the run chips is gone. In its place, two small emoji
    buttons, 🚇 and 🚍, sit in each app's existing footer row, just before "back", while trains or buses are shown.
  - Every Mini App's footer tag drops "Singapore" and keeps "Experimental": *"Experimental · v0.62.971"*.
  - Each button opens a drawer that slides up over the map, centred, the width of an eatery card (15% space left and
    right), with a scrollbar. 🚇 lists the stations tapped, 🚍 the bus stops tapped, each with a tiny ❌.
  - Up to 5 stations and up to 5 bus stops at once. Tapping a 6th drops the oldest. Tapping another stop adds it.
  - Outside service hours nothing moves. The header alert band says when service resumes:
    *"<line code> Normal train operations will resume at <time>"* (with the date when it is not today), and
    *"<bus operator> operations will resume at <time>"* (likewise).
- Force: MUST. Operator, 04-11 '26: *"the train and bus details at the bottom bar obstruct the rest of the information
  which are essential. Use a bus 🚍 or train 🚇 emoji and setup a overlay of drawer lo show which train station select
  or bus stop select … width of the eatery card and not fill the width of the phone with 15% left and right spacing
  left. … if I clip on other bus stop it should also add to the drawer. max is 5 bus stop. and max 5 train station.
  the drawer should have a tiny ❌ emoji to allow delete and scrollbar. … if the station timing and bus network timing
  is not operating, don't show any bus or train movement"*, with the two message formats quoted above. Then, while
  this spec was being written: *"remove "Singapore" keep "Experimental" from all TMA. the bus emoji and train emoji
  before the "back""*.
- Done when:
  - `run-drawer.test.js` passes; the suite is green; the five apps build;
  - headless renders of the built Train, Hawker and Cuisine apps show: the two footer buttons in the existing row and
    no extra row; the drawer at 70% width with the stations and stops listed; a 6th station dropping the oldest; a ❌
    removing one; at 02:00 SGT no trains and the header line "NSL Normal train operations will resume at 05:30"; with a
    stubbed stop whose services have no buses, no bus markers and the operator line;
  - after deploy, one real `stop-resume` call on production returns operator names and first-bus times.

## Interpretation
- UNDERSTANDING (measured 04-11, read-only):
  - **The footer, measured at 390 px wide on the built apps** (operator: *"check if possible, as different TMA may not
    have space, report with a plan"*):

    | App | Footer row | Free width | Where the buttons go (operator: *"before the back"*) |
    |---|---|---|---|
    | Train | tag line · List · Schematic · back | 1 px, but the tag line truncates by design, and loses "Singapore" (C11) | just before ⇠ back |
    | Hawker | List · Map · NEA ↗ · top · back | 107 px | between ⇡ top and ↩ back |
    | Cuisine | hide results · list · top · end | 121 px | between ⇡ top and 🔚 end (Cuisine's back/end button) |

    Two 26 px buttons with a gap need about 56 px, so all three fit without a new row.
  - **What runs now.** v0.62.969 and v0.62.970 keep a list of train *lines* (accumulated from station taps) and one
    *stop* at a time. The footer chips live in `FooterRunChips` (shared) and a copy inside the Train `App.jsx`.
  - **Train hours.** `train-sim.json` holds each line's first and last train for weekdays and weekends (for example
    NSL 05:30 to 00:20 on weekdays). The simulator already draws nothing out of hours; it does not say when service
    resumes. A disruption carries no resume time in LTA's feed.
  - **Bus hours.** LTA's BusRoutes gives each stop on each route its first and last bus for weekdays, Saturdays and
    Sundays. The route cache built in v0.62.967 drops those fields. LTA's arrival feed gives each service's operator
    code (SBST, SMRT, TTS, GAS). `holidays.js` already knows Singapore public holidays.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Stations, not lines.** The trains follow the stations in the drawer: the lines drawn are the union of their
    lines that have a timetable. Removing a station removes only the lines no remaining station covers.
  - C2 — **Five of each, oldest out (A1).** A 6th station or stop drops the one added first. Tapping one already in the
    drawer moves it to newest.
  - C3 — **Buses at older stops (A3).** The newest stop shows 2 coming and 2 going per service, as now. The other four
    show only their 2 coming buses, from the existing `bus-arrival` route (1 LTA call each), refreshed every 30 s.
  - C4 — **The buttons (A2, A6).** `🚇 n` and `🚍 n` (n = how many are in the drawer), 26 px tall, in each app's
    existing footer row just before its back button (the table above), shown only while something is listed. The chip
    row and both copies of the chip component are removed.
  - C5 — **The drawer.** Slides up from the bottom over the map, above the footer; 70% of the screen wide (15% each
    side); at most 45% of the screen tall, then it scrolls. One row per station or stop, newest first: its name, its
    lines or bus count, and a tiny ❌. Tapping outside or the same button closes it. No "Stop all": the last ❌ empties
    it.
  - C6 — **Train resume times.** A listed line whose state is out of hours draws no trains, and the header says
    *"<CODE> Normal train operations will resume at HH:MM"*, adding *", <Day> <d> <Mon>"* when the next first train is
    not today. Weekend times on Saturdays, Sundays and public holidays. A *disrupted* line also draws nothing, but LTA
    gives no resume time, so its header line is *"<CODE> <LTA's own alert text>"* rather than an invented time.
  - C7 — **Bus resume times.** The server keeps each route stop's first and last bus (weekday, Saturday, Sunday) when it
    refreshes routes, and a new `GET /api/transport/stop-resume?code=` returns, for each operator at the stop whose
    services all have no bus now and are outside their hours, the earliest next first bus. Sunday times apply on public
    holidays. The header says *"<Operator> operations will resume at HH:MM"* with the date when not today. Operator
    names: SBST → SBS Transit, SMRT → SMRT Buses, TTS → Tower Transit Singapore, GAS → Go-Ahead Singapore.
  - C8 — **Where the messages go (A4).** A `ResumeStrip` in the header alert band, beside the weather and simulation
    strips, one line per line or operator not running, with a ✕ that hides it until the set changes.
  - C9 — **One release, three apps**, through the shared components, so no app has a copy of another's UI.
  - C11 — **The footer tag (A7).** "Singapore" leaves the tag in every Mini App that shows it, in all nine locales:
    `footer.tag` in the Train, Hawker and Menu string tables and `chrome.experimental` in Clipboard become the word for
    "Experimental" alone; Cuisine's tag drops its region part (Singapore, Johor or Others), since it showed the same
    place word. The Oversight and About apps show no tag. Keys and their counts are unchanged.
  - C10 — **Expected test edits (F7, each quoted in the journal).** `station-sim.test.js` and `stop-buses.test.js` pin
    the Train footer chips and the one-stop layer; `hawker-cuisine-run.test.js` pins `FooterRunChips` in both apps;
    `locale-restore-coherence.test.js` may need the renamed Cuisine states. Each pin is changed to describe the new
    behaviour, not deleted. Nothing is kept across a reopen.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | A 6th station or stop drops the oldest (C2) | confirmed | Operator, 04-11 '26, choosing between stated options: *"Drop the oldest (Recommended)"* |
| A2 | The buttons go in each app's existing footer bar, where there is room (C4) | confirmed | Operator, 04-11 '26: *"add to the status/footer bar (check if possible, as different TMA may not have space) report with a plan"*; the measured plan is the table above |
| A3 | The newest stop shows coming and going buses; the older four show coming buses only (C3) | confirmed | Operator, 04-11 '26, choosing between stated options: *"Coming buses only for older stops"* |
| A4 | The resume messages show in the header alert band (C8) | confirmed | Operator, 04-11 '26, choosing between stated options: *"In the header alert band"* |
| A5 | Up to 5 stations and 5 stops; a tiny ❌ per row; a scrollbar; the drawer 70% wide | confirmed | Operator, 04-11 '26, quoted in Intent |
| A6 | The two buttons sit just before "back" | confirmed | Operator, 04-11 '26: *"the bus emoji and train emoji before the "back""* |
| A7 | "Singapore" leaves every Mini App's footer tag; "Experimental" stays | confirmed | Operator, 04-11 '26: *"remove "Singapore" keep "Experimental" from all TMA"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | At most 5 stations and 5 stops; a 6th drops the oldest; a repeat moves to newest; a ❌ removes one | `run-state.js` | none | an unbounded list, or the wrong one dropped | `run-drawer.test.js`: the pure list reducer |
| I2 | The lines drawn are exactly the timetabled lines of the listed stations | `run-state.js`, controller, Train panel | none | trains on a line no listed station serves | `run-drawer.test.js` |
| I3 | Out of hours, no train or bus is drawn, and the header gives the resume time in the operator's format, with the date when not today | `train-sim.js`, `transport.js`, `ResumeStrip` | a disruption has no time (C6) | trains moving at 02:00, or a made-up time | `run-drawer.test.js` with fixed clocks; the renders at 02:00 |
| I4 | First and last bus times are kept per route stop and used with the right day type, public holidays as Sunday | `transport.js`, `index.js` | none | weekday times on a Sunday | `run-drawer.test.js` with stubbed BusRoutes and holidays |
| I5 | The newest stop costs its route sampling; each older stop costs 1 LTA call per refresh | stop layer | none | five full samplings every 20 s | `run-drawer.test.js`: counted stubbed calls |
| I6 | The footer keeps its height: two buttons in the existing row, no chip row; the drawer is 70% wide, scrolls, and has a ❌ per row | shared components, three Apps | none | the footer covering the cards again | the renders: footer height equal to before; drawer width |
| I8 | No footer tag in any Mini App says Singapore (in any locale); each still says Experimental | the four string tables, Cuisine `App.jsx` | none | a tag that still names the place | `run-drawer.test.js`: every locale's tag value; the renders |
| I7 | Nothing is kept across a reopen; the suite passes; the five apps build | suite, builds | none | a revived list or a broken neighbour | `npm test`; builds |

## Acceptance criteria
- [ ] Tests written first and red → I1-I5
- [ ] `run-state.js` (pure lists, the resume-message model); the route cache's first and last bus; `stop-resume`;
      the multi-stop layer; the Train panel and the shared controller on stations; `FooterRunButtons`, `RunDrawer`,
      `ResumeStrip` in all three apps; the chip row and both chip components removed → I1-I7
- [ ] Mutations, each proved applied and restored, all caught: the limit raised to 6; the newest dropped instead of the
      oldest; a removed station leaving its lines drawn; trains drawn out of hours; weekday bus times used on a
      Sunday; the date left off a next-day resume; older stops sampled in full; the chip row left in a footer; "Singapore" left in one locale's footer tag
- [ ] Existing tests edited only as C10 lists, each edit quoted (F7)
- [ ] Headless renders of the three built apps as in "Done when"
- [ ] Full suite green; five builds; `package.json` bumped to 0.62.971
- [ ] After deploy, one real `stop-resume` call on production

## Out of scope
- Real train arrival times, which no open feed provides.
- Bus timetables beyond first and last bus.
- Moving the shared code out of the Train app (the earlier C1 tidy-up).

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
