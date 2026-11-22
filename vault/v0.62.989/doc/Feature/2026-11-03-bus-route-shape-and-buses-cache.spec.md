---
flow: spec
title: "Bus route: keep the road where Directions can draw it, stop paying for failures, share one bus reading per 20 seconds"
act: "directive"
force: "MUST"
scope:
  - "transport.js"
  - "index.js"
  - "web/transport/src/lib/bus-route.js"
  - "__tests__/bus-route-cache.test.js"
  - "package.json"
  - "doc/Feature/2026-11-03-bus-route-shape-and-buses-cache.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Bus route: the road shape where it can be drawn, failures not paid for twice, one bus reading shared per 20 seconds

Version: 0.1. Date: 3 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.968**.

## Intent
- Outcome:
  - When Google Directions cannot draw part of a bus route, the parts it can draw still follow the road, the failing
    part is drawn stop to stop, and the result is cached for 30 days like a full road shape.
  - A Directions failure is logged with its status, and is never paid for on every view.
  - The buses on a route are read from LTA at most once every 20 seconds per service and direction, however many
    people are viewing it.
- Force: MUST. Operator, 03-11 '26: *"draft the spec for the shape and buses cache fix"*, after the production check
  in `[AMD-297]` (№ 4,485) found service 10 direction 2 drawn straight on every call, unlogged, and refetched each
  time.
- Done when:
  - `bus-route-cache.test.js` passes, and `bus-route.test.js` passes unedited;
  - the suite is green and the Train app builds;
  - after deploy, one call of service 10 direction 2 on production returns `shapeSource` `road` or `partial`, or
    returns `straight` with a logged Directions status that says why; and a second call within the hour costs no
    Directions request (read from the log: no new status line, and the response returns from cache).

## Interpretation
- UNDERSTANDING (measured 03-11, read-only):
  - **The failure.** `transport.routeShape` (`transport.js`, v0.62.967) fetches a route in chunks of 25 points (a
    74-stop route is four requests). If any chunk answers with a status other than OK, the whole function returns null
    **without logging**, and nothing is cached. So the route is drawn stop to stop, and the next view pays for up to
    four requests again. On production at 07:18 SGT, service 10 direction 2 did exactly this twice; direction 1 drew a
    579-point road shape.
  - **The cause is not known yet.** The sandbox has no Google key, so the status cannot be read from here. The log
    line this spec adds will name it. A ZERO_RESULTS on one chunk, from a stop whose `via:` point cannot be driven
    through in order, is the likeliest reading; it is inference.
  - **The buses.** `transport.busRouteBuses` asks LTA's arrival feed for every fifth stop plus the last on each call
    (about 13 calls for a 60-stop route) and caches nothing. Every viewer refreshes every 30 seconds, so ten people on
    one route make ten times the calls.
  - **Guards already in place.** `bus-route.test.js` pins `routeShape`'s current contract: an array of points, null
    without a key, null on a thrown Directions error, null past the daily cap, one fetch per 30 days, and the line
    `transport.routeShape(redis, service, direction, stops)` in `index.js`. This spec keeps all of them true, so that
    file stays unedited.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **Per-chunk fallback (A1).** A chunk whose status is route-specific (`ZERO_RESULTS`, `NOT_FOUND`) is
    replaced by its own stops, joined straight; the other chunks keep the road. If at least one chunk followed the
    road, the result is `partial`; if none did, `straight`. Either way it is cached for 30 days under the same stop
    signature as a road shape, so it is paid for once.
  - C2 — **Account and transient failures are not cached for 30 days.** A thrown error (network, timeout) or an
    account-level status (`REQUEST_DENIED`, `OVER_QUERY_LIMIT`, `OVER_DAILY_LIMIT`, `INVALID_REQUEST`,
    `UNKNOWN_ERROR`, or any status not named in C1) returns null as today, so a fixed key or a passing outage is not
    hidden for a month. Instead a one-hour marker (`lta:busroute:shapewait:<service>:<direction>`) stops that direction
    being retried, and paid for, more than once an hour.
  - C3 — **Every non-OK status is logged**, once per fetch: `[Transport] bus route shape <service>/<direction> chunk
    <n> of <m>: <status>`. No key or URL is logged.
  - C4 — **How the source reaches the client.** `routeShape` still returns an array of points (or null). A partial
    array carries `partial = true` as a property, which is not serialised. `index.js` keeps its `routeShape` line and
    sets `shapeSource` to `partial`, `road` or `straight` from it. The client already passes `shapeSource` to the
    strip untouched.
  - C5 — **The strip.** `routeStripModel` adds "· partly straight lines" for `partial`, from a new nine-locale key
    `route.partial` in `bus-route.js`. `straight` keeps "· straight lines".
  - C6 — **The buses (A2).** `busRouteBuses` caches its result per service and direction for 20 seconds
    (`lta:busroute:buses:<service>:<direction>`). Within that window every caller gets the same buses and the same
    `readAt`, which stays the time LTA was actually read, so the strip never claims a fresher reading than it has.
    Two callers arriving in the same instant with an empty cache may both read LTA; that is accepted rather than
    adding a lock.
  - C7 — **Cost after this.** Each direction of each service costs at most one road-shape fetch (up to four
    Directions requests for a 74-stop route) per 30 days when it succeeds or partly succeeds, and at most one per hour
    while an account-level failure lasts. The 200-a-day cap stays as the outer bound. `[AMD-296]` stated that bound as
    about US$2 a day; the measured worst case is about US$8 a day (four requests per fetch), as `[AMD-297]` records.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | When part of a route cannot be drawn, the parts that can stay on the road and the failing part is stop to stop, cached 30 days (C1) | confirmed | Operator, 03-11 '26, choosing between stated options: *"Road where possible (Recommended)"* |
| A2 | One reading of a route's buses is shared between viewers for 20 seconds (C6) | confirmed | Operator, 03-11 '26, choosing between stated options: *"20 seconds (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | A route-specific failure on one chunk keeps the other chunks on the road, draws that chunk stop to stop, and is cached for 30 days | `transport.js` | the statuses named in C1 | a whole route drawn straight because one chunk failed; the same failure paid for on every view | `bus-route-cache.test.js`: a stubbed ZERO_RESULTS on chunk 2 of 3, then a second call with no Directions request |
| I2 | Every non-OK status is logged with service, direction, chunk and status, and never the key | `transport.js` | none | a silent failure nobody can diagnose | `bus-route-cache.test.js`: a spied `console.warn` |
| I3 | An account-level or transient failure returns null, is not cached for 30 days, and is not retried for an hour | `transport.js` | none | a fixed key hidden for a month; or a broken key paid for on every view | `bus-route-cache.test.js`: REQUEST_DENIED and a thrown error, each followed by a second call |
| I4 | `routeShape`'s existing contract still holds | `transport.js`, `index.js` | none | a changed function the existing guards no longer describe | `bus-route.test.js`, unedited |
| I5 | The strip says "partly straight lines" for a partial shape, in nine locales | `bus-route.js`, `index.js` | none | a part-straight route presented as fully on the road | `bus-route-cache.test.js`: `routeStripModel` with `partial`; `bus-route.test.js`'s locale check covers the new key |
| I6 | Within 20 seconds every caller gets the same buses and `readAt` from one set of LTA calls; after 20 seconds LTA is read again | `transport.js` | the same-instant race in C6 | ten viewers making ten times the calls; or a stale reading labelled fresh | `bus-route-cache.test.js`: two calls inside the window, one after it |
| I7 | The suite passes and the Train app builds | suite, build | none | a broken neighbour | `npm test`; `vite build` |

## Acceptance criteria
- [ ] Tests written first in `__tests__/bus-route-cache.test.js` and red → I1-I3, I5, I6
- [ ] `routeShape` per-chunk fallback, the wait marker, the status log; `index.js` shape source; `route.partial`; the
      buses cache → I1-I6
- [ ] Mutations, each proved applied and restored, all caught: a route-specific failure returning null instead of the
      mixed shape; the mixed shape not cached; the status log removed; an account-level failure cached for 30 days;
      the wait marker not set; the buses cache bypassed; the buses `readAt` replaced by the time of the cache hit; the
      `partial` label dropped
- [ ] `bus-route.test.js` passes unedited; full suite green; Train build; `package.json` bumped to 0.62.968
- [ ] After deploy, one call of service 10 direction 2 on production, and a second within the hour, as in "Done when"

## Out of scope
- Caching the stop bubble's own arrival call (`/api/transport/bus-arrival`), which the chat also uses.
- Choosing different waypoints to make Directions succeed where it says ZERO_RESULTS.
- A lock against the same-instant race in C6.
- Train arrival estimates (№ 4,482 §C), which are a separate question.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
