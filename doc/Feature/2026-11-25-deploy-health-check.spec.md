---
flow: spec
title: "A deploy switches traffic only when the new build answers /readyz"
act: "directive"
force: "MUST"
scope:
  - "index.js"
  - "__tests__/**"
  - "package.json"
  - "package-lock.json"
  - "doc/Feature/2026-11-25-deploy-health-check.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
  - "CLAUDE.md"
verify: ""
---

# A deploy switches traffic only when the new build answers /readyz

Version 1, 25-11 '26 19:26 SGT. One release, v0.62.994, and one production setting.

## Intent
- Outcome: no request fails because of a deploy. Railway keeps the old build serving until the new build answers `/readyz` with 200.
- Force: MUST - the operator chose the route, who sets it and how it is proved in the dialog of 25-11 '26, after *"continue"*.
- Done when: on the deploy of v0.62.994, a once-a-second poll of `https://soleat.net/healthz`, started before the merge and stopped after the new version has answered for 30 seconds, records zero failed requests; and Railway's deploy log shows the old container stopped after the new one logged `[HTTP] Listening`.

## Interpretation
- UNDERSTANDING: on 25-11 '26 I listed what could be built or fixed and recommended this item first. The operator replied *"continue"*, which I read as: go ahead in the recommended order. Treated as given, from Railway's documentation read on 25-11 '26 (`docs.railway.com/deployments/healthchecks`): with a health check path set, Railway queries it until a 2xx and only then makes the new deployment active and the previous one inactive; the check uses the injected `PORT`; its requests carry the hostname `healthcheck.railway.app`; the default timeout is 300 seconds, after which the deploy is marked failed; the route is not monitored after the deploy goes live; a service with a volume cannot overlap (this service has none).
- GAPS: none open. The three choices that could change the outcome were put to the operator and answered (Assumptions A1 to A3).

## What was measured before this spec

Deploy of v0.62.993 on 24-11 '26, times in SGT, from Railway's deploy log and my own poll:

| Time | Event |
|---|---|
| 10:42:16.6 | New container starts |
| 10:42:17.2 | New build registers the Telegram webhook (the old build is still serving) |
| 10:42:19.1 | Railway marks the deployment SUCCESS |
| 10:42:23.8 | Old container is stopped |
| 10:42:26.9 | A request to `/healthz` gets 502, "connection refused" |
| 10:42:39.0 | New build logs `[HTTP] Listening on :8080` |
| 10:42:42 | First answer from 0.62.993 |

So for about 15 to 20 seconds nothing was listening. One failed request was seen, by my own poll at one request every 15 seconds; the length of the window is read from the log's timestamps. The service's configuration, read on 25-11 '26, has no health check, no volume and one replica.

A `railway.json` file is not an option: Railway's documentation says Config as Code stops working on 2026-12-01 and new services cannot opt in. The setting has to be made on the service.

## What gets built

### Part A - the repository (v0.62.994, no behaviour change)
- A-1. `index.js`: a comment at the two health routes saying that `/readyz` is Railway's deploy gate, that nothing may stand in front of it that needs credentials, and that renaming it means changing the service setting first. Comment lines only.
- A-2. New test file `__tests__/deploy-health-gate.test.js`, reading `index.js` with comments masked (the existing helper):
  - `/readyz` is registered with `app.get` and its handler directly, with no middleware between the path and the handler;
  - every `app.use(` with no path that comes before it is on a short named list (today: `express.json()`), so that a new global gate cannot be added in front of the route without this test asking the question;
  - the route answers 200 when ready and 503 when not;
  - the server listens on `process.env.PORT`, the port Railway's check uses;
  - and, read without masking, the comment of A-1 is there and names the service setting.
- A-3. `package.json` and `package-lock.json` to 0.62.994. Journal entry, counters, anchor, ledger row. The held record `[AMD-355]` rides this pull request (D-210).

Four of the five cases pin what is already true on `main` and pass from the start; only the last fails until the comment is written. Their worth is shown by mutations in a scratch copy, not by a red first run: credentials added in front of the route, the route renamed, a fixed port, the status line changed, a global gate added.

### Part B - the production setting (its own approval)
- B-1. After Part A is pushed and CI is green, and before the merge: set `healthcheckPath` to `/readyz` on the service `gia4lunch`, production environment, through the Railway connection. Only after the operator's exact line `APPROVE set healthcheck /readyz`, or their Allow on that call's permission prompt.
- B-2. One field. The timeout stays at Railway's default of 300 seconds. No variable is changed and no redeploy is triggered; the setting applies from the next deploy.
- B-3. The configuration is read before and after, and the two are compared.
- B-4. To undo: clear the field. Whether the connection accepts an empty value is untested; the dashboard does (service, Settings, Deploy, Healthcheck Path).

### Part C - the proof, on this release's own deploy
- C-1. Before the merge, start a poll of `https://soleat.net/healthz` once a second, written to a log with the time, the HTTP status and the version. It stops when 0.62.994 has answered for 30 seconds, or after 40 minutes.
- C-2. Report: the number of failed requests (any status other than 200, and any connection error); the last second 0.62.993 answered and the first second 0.62.994 did; from Railway's deploy log, the new container's start, its `[HTTP] Listening` line and the old container's stop; and Railway's HTTP log for the same window, filtered to status 500 and above.
- C-3. If Railway marks the deployment FAILED, production stays on 0.62.993. I report at once and change nothing: no redeploy, no setting, without a fresh APPROVE.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The route Railway asks is `/readyz`: 200 only when the server is listening and Redis answers. A deploy during a Redis outage longer than 5 minutes is marked failed and the old build keeps serving | confirmed | Operator, dialog of 25-11 '26: *"/readyz (Recommended)"* |
| A2 | Claude makes the setting through the Railway connection, only after the operator's exact APPROVE line; no redeploy | confirmed | Operator, dialog of 25-11 '26: *"Claude, on my APPROVE (Recommended)"* |
| A3 | It is proved by a small release now, v0.62.994, with no behaviour change, whose own deploy is the first gated one; it carries the held merge record for #1937 | confirmed | Operator, dialog of 25-11 '26: *"Small release now (Recommended)"* |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Known limits
- Railway's behaviour is read from its documentation and has not been observed on this service. Part C is the observation.
- That the check reaches the right port is an inference: the app listens on `process.env.PORT` and logged `:8080`, and the documentation says the check uses the injected `PORT`. If it is wrong, the deploy is marked failed and the old build keeps serving.
- The poll makes one short request a second from this container. A failure that falls between two requests is missed; Railway's HTTP log is the second source.
- A request already in flight on the old build when it is stopped is cut, as today: the app has no handler for the stop signal. A long search could be lost this way at the switch. Not changed here, and the poll's short requests would not show it.
- Two builds run side by side for longer: about 25 to 30 seconds, against about 7 today. The new build's boot actions already run while the old one serves (the webhook was registered 0.6 seconds after start on 24-11), and the repeating timers first fire 5 minutes after boot. I found no action that the longer overlap would newly double; no test can prove there is none.
- The new test reads source text. It is a tripwire against a rename or a gate in front of the route, not a proof that Railway's check passes.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | Part A changes no behaviour | `index.js` | comment lines only | tidying nearby code while there | command: every line `git diff origin/main -- index.js` adds begins with `//` once trimmed, and it removes none; `node --check index.js`; `npm test` |
| I2 | `/readyz` answers without credentials, 200 when ready and 503 when not | the two health routes | the deploy gate only | a gate or a rename would fail every deploy | `__tests__/deploy-health-gate.test.js`; `__tests__/redis-guard.test.js` ("/readyz asks the probe and returns 503 when Redis is not ready") |
| I3 | `/healthz` stays always 200, because the webhook fail-over reads it | `index.js` | not touched | pointing both checks at one route | `__tests__/redis-guard.test.js` ("/healthz is always 200 with service:gia") |
| I4 | The production setting changes only on the operator's exact approval, and only one field | Railway service `gia4lunch`, production | `healthcheckPath` and nothing else | adding a timeout, a drain time or a redeploy "while there" | the configuration read before and after B-1; the only difference is `healthcheckPath: "/readyz"` |
| I5 | Production answers throughout the deploy | the deploy of v0.62.994 | this one deploy | declaring success from Railway's status alone | the poll log of C-1: zero failed requests; Railway's HTTP log: no status 500 or above in the window |
| I6 | The old build stops only after the new one is listening | the same deploy | this one deploy | reading a green status as proof of order | Railway's deploy log: the old container's stop is later than the new build's `[HTTP] Listening` line |
| I7 | No owner chat ID or home coordinates in any file, pull request or page | everything written | none | pasting log lines | `__tests__/no-owner-chat-id.test.js`, inside `npm test` |
| I8 | Merge only on the operator's word | the pull request | none | merging when green | the operator's `APPROVE merge #N` in the record |

## Acceptance criteria
- [ ] `__tests__/deploy-health-gate.test.js` exists; its last case fails before A-1 and all five pass after it → `npx vitest run __tests__/deploy-health-gate.test.js`
- [ ] Five mutations in a scratch copy are each caught, and each is proved applied before its outcome is read → the mutation log
- [ ] `index.js` differs from `main` by comment lines only → the command of I1
- [ ] `npm test` passes; `node --check index.js` passes → their output
- [ ] After the operator's approval, the service's configuration shows `healthcheckPath: "/readyz"` and no other difference → the before and after read of B-3
- [ ] On the deploy of v0.62.994 the poll records zero failed requests, Railway's HTTP log shows no status 500 or above in the window, and the old container stops after the new build's `[HTTP] Listening` line → the poll log and Railway's logs
- [ ] The Journal entry, the counters, the anchor and the ledger row are written; `[AMD-355]` is carried → the pull request's diff

## Out of scope
- The Telegram webhook registration at boot discards queued messages (`drop_pending_updates: true`). On a deploy the old build is still serving at that moment, so little is queued; after a crash, messages sent while the bot was down are discarded. Logged as a finding; it needs its own decision.
- A handler for the stop signal, a drain time, overlap seconds, the restart policy, replicas, continuous monitoring.
- Moving the service to Railway's Infrastructure as Code.
- Every other item on the list of 25-11 '26.

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
