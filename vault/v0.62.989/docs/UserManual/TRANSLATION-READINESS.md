# Soleat Translation Readiness

## Purpose

This note defines what must be stable before translating the Soleat User Manual.

The English master is now drafted, but translation should not begin until terminology, help IDs, food terms, and examples are reviewed.

## Translation readiness status

Status: `not-ready-for-translation`

Reason: glossary and help-ID contract review are in progress. Food examples and UI labels still need review before translation begins.

## Required inputs before translation

Translation should begin only after these files are reviewed together:

```text
docs/UserManual/en/00-table-of-contents.md
docs/UserManual/en/00-sections-1-to-6.md
docs/UserManual/en/01-sections-7-to-10.md
docs/UserManual/en/02-sections-11-to-14.md
docs/UserManual/en/03-sections-15-to-18.md
docs/UserManual/en/04-sections-19-to-24.md
docs/UserManual/en/05-sections-25-to-29.md
docs/UserManual/glossary/terms.en.json
docs/UserManual/FOOD-TERM-TRANSLATION-POLICY.md
docs/UserManual/HELP-ID-CONTRACT-REVIEW.md
docs/UserManual/help-registry.seed.json
```

## Translation gates

### Gate 1 — English master stability

- [ ] Sections 1–29 are editorially stable.
- [ ] Table of contents links are stable.
- [ ] Public command list is validated.
- [ ] No owner-only or admin commands appear in the public manual.

### Gate 2 — Glossary stability

- [ ] Product names are marked non-translatable where needed.
- [ ] Feature names have preferred translation behaviour.
- [ ] Sketchbook / Clipboard objects are consistent.
- [ ] Singapore-specific feature names remain explicit.
- [ ] Caution phrases are represented consistently.

### Gate 3 — Food-term review

- [ ] Ambiguous food examples are reviewed.
- [ ] Dish names are not blindly translated.
- [ ] Native-script food names are preserved where useful.
- [ ] Cuisine context is preserved in examples.
- [ ] Set-meal wording does not overpromise availability.

### Gate 4 — Help-ID stability

- [ ] Help IDs are reviewed as future app contracts.
- [ ] Help targets are stable enough for future TMA wiring.
- [ ] Help IDs are not derived only from section numbers.
- [ ] Screenshot/image needs are identified.

## Language order

The current supported-language scaffold lists:

```text
French
Indonesian
Russian
German
Chinese
Japanese
Spanish
```

Recommended translation order:

1. Chinese and Japanese first for native-script food-term pressure testing.
2. Indonesian next for Southeast Asian food-context review.
3. French, German, Spanish, and Russian after terminology patterns are stable.

## Translation warning

Do not translate search examples mechanically.

Example:

```text
dumpling
```

may require different treatment depending on whether the intended search is:

```text
Chinese dumplings
Singapore dumpling soup
Japanese gyoza
Korean mandu
```

Translate the intent, not only the word.

## Recommendation

Before starting translated manuals, create a translation-prep PR that:

- marks stable glossary terms;
- adds per-language translation status fields;
- identifies examples requiring food-term review;
- decides which UI labels remain English product terms;
- prepares native-script food-name guidance.
