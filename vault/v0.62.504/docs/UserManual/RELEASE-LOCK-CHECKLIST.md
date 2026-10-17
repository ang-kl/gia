# Soleat User Manual Release Lock Checklist

## Purpose

This checklist defines what must be complete before the Soleat User Manual English master is considered locked.

Locking the English master means the manual can safely become the source for translation, screenshots, and future TMA contextual-help wiring.

## Lock status

Status: `not-locked`

## Gate 1 — English master completeness

- [x] Sections 1–29 exist.
- [x] Table of Contents exists.
- [x] Supporting standards exist.
- [x] QA checklist exists.
- [x] QA run report exists.
- [ ] Final editorial pass complete.
- [ ] Section headings approved as stable enough for manual navigation.

## Gate 2 — Terminology lock

- [x] English glossary expanded.
- [x] Product names marked for translation behaviour.
- [x] Commands marked non-translatable.
- [x] Singapore-specific terms recorded.
- [ ] Glossary reviewed by product owner.
- [ ] Glossary reviewed for all target languages.

## Gate 3 — Command lock

- [x] Public command validation document exists.
- [x] Owner-only and diagnostic commands excluded from public manual.
- [ ] Runtime bot command registration checked.
- [ ] Pending aliases resolved.
- [ ] Public command table patched if aliases differ from runtime.

## Gate 4 — Help ID lock

- [x] Help registry seed exists.
- [x] Help-ID contract review exists.
- [ ] Help IDs approved as stable future app contracts.
- [ ] Missing screen/state IDs identified.
- [ ] Help levels decided: quick help, guided help, full manual.

## Gate 5 — Image and screenshot lock

- [x] Image registry seed exists.
- [ ] Required screenshots confirmed.
- [ ] Required diagrams confirmed.
- [ ] Alt text reviewed.
- [ ] Image IDs approved.
- [ ] Image capture or design workflow defined.

## Gate 6 — Food-term lock

- [x] Food-term translation policy exists.
- [x] Food-term review queue exists.
- [ ] Chinese food-term notes added.
- [ ] Japanese food-term notes added.
- [ ] Indonesian food-term notes added.
- [ ] Remaining target-language food-term risks reviewed.
- [ ] Search examples approved for translation by intent.

## Gate 7 — Translation lock

- [x] Localisation scaffold exists.
- [x] Translation status file records gates.
- [ ] Translation gates marked complete.
- [ ] Per-language workflow agreed.
- [ ] First target language selected for translation pilot.

## Gate 8 — TMA help lock

- [x] TMA Help Integration note exists.
- [ ] Help IDs mapped to actual UI surfaces.
- [ ] Help payload shape defined.
- [ ] Screenshot/image assets linked.
- [ ] App wiring PR planned.

## Release-lock decision

The English manual can be marked `locked-for-translation` only when Gates 1–7 are complete.

The manual can be marked `ready-for-tma-help-wiring` only when Gates 1–8 are complete.

## Next recommended PRs

1. Command alias runtime validation patch.
2. Help ID final contract review patch.
3. Image registry review patch.
4. Chinese and Japanese food-term notes.
5. Final English editorial lock patch.
