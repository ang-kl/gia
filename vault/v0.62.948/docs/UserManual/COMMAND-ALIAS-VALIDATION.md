# Soleat Command Alias Validation

## Purpose

This document checks the public command names used in the Soleat User Manual against available repo evidence.

It is not a substitute for checking the current live Telegram bot command list. It records the evidence used and flags aliases that still need final runtime validation.

## Evidence reviewed

The feature stocktake for v0.60 records the following user-facing command surfaces:

```text
/cuisine /c
/s
/recognised
/hidden
/hawker
/transport
/carpark
/weather
/l /location
/clipboard
/share
/picks
/legal
/privacy
/forgetme
/start
/language
```

It also records owner-only hidden commands that should not appear in the public user manual:

```text
/oversight
/ver
/ftlog
```

## Public command review

| Manual command | Status | Evidence / note |
|---|---|---|
| `/start` | confirmed | Listed in Menu & utility. |
| `/menu` | needs runtime validation | Manual and menu feature use this, but v0.60 evidence says Menu TMA, not the exact `/menu` command. Validate against current bot commands. |
| `/m` | needs runtime validation | Manual includes alias. Validate against current bot commands. |
| `/cuisine` | confirmed | Listed as Cuisine discovery surface. |
| `/c` | confirmed | Listed as Cuisine discovery alias. |
| `/search` | needs runtime validation | Manual includes `/search`; repo evidence reviewed confirms `/s` and free-text chat. Validate whether `/search` is currently registered. |
| `/s` | confirmed | Listed as free-text / cooking-method search surface. |
| `/recognised` | confirmed | Listed as recognised venues surface. |
| `/hidden` | confirmed | Listed as hidden gems surface. |
| `/hawker` | confirmed | Listed as hawker-centres surface. |
| `/transport` | confirmed | Listed as transport surface. |
| `/carpark` | confirmed | Listed as carpark surface. |
| `/weather` | confirmed | Listed as weather surface. |
| `/location` | confirmed | Listed with `/l` as location surface. |
| `/l` | confirmed | Listed as location alias. |
| `/clipboard` | confirmed | Listed as Menu & utility surface. |
| `/clip` | needs runtime validation | Manual includes alias. Validate against current bot commands. |
| `/share` | confirmed | Listed as Menu & utility surface. |
| `/picks` | confirmed | Listed as Menu & utility surface. |
| `/language` | confirmed | Listed as Menu & utility surface. |
| `/privacy` | confirmed | Listed as Menu & utility surface. |
| `/forgetme` | confirmed | Listed as Menu & utility surface. |
| `/legal` | confirmed but not highlighted | Listed in repo evidence, but not emphasised in the public manual command overview. Keep as support/legal surface if needed. |

## Commands excluded from the public manual

| Command | Reason |
|---|---|
| `/oversight` | Owner-only / hidden diagnostics surface. |
| `/ver` | Owner-only / diagnostic. |
| `/ftlog` | Owner-only / diagnostic. |
| `/cost` | Not part of the reviewed public command evidence; exclude unless later confirmed as public. |
| `/log` | Not part of the reviewed public command evidence; exclude unless later confirmed as public. |

## Manual impact

The current public manual is broadly aligned with repo evidence, with three aliases needing final runtime validation:

```text
/menu
/m
/search
/clip
```

Recommended action before marking command docs stable:

1. Export or inspect the current bot command registration list.
2. Confirm whether `/menu`, `/m`, `/search`, and `/clip` are registered.
3. If any alias is not registered, remove it from the public manual or mark it as unavailable.
4. Keep owner-only and diagnostic commands excluded from all user-facing manual pages.

## Recommendation

Do not translate command tables until this validation is complete.

Commands themselves should remain un-translated, but their descriptions should be translated after the command list is stable.
