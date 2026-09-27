# Soleat Food-Term Review Queue

## Purpose

This queue lists food terms and examples that must be reviewed before translation begins.

The goal is to preserve user search intent, not merely translate words.

## Priority 1 — Ambiguous food terms

| English term / example | Why review is needed | Review note |
|---|---|---|
| dumpling | Too broad across cuisines. | Must distinguish Chinese dumplings, Singapore dumpling soup, Japanese gyoza, Korean mandu, and other local meanings. |
| set meal | Menu format varies by country and language. | Translate by local menu usage; do not imply guaranteed availability. |
| hidden gem | Idiom may not translate naturally. | Translate as discovery / lesser-known place if idiom is weak. |
| what to try | UI suggestion label. | Translate as a helpful recommendation phrase, not as a literal technical term. |
| food trail | Planning concept. | Translate as multi-stop food plan if no natural equivalent exists. |

## Priority 2 — Cuisine and local examples

| Example | Review note |
|---|---|
| Japanese gyoza near Orchard | Preserve Japanese context. |
| Korean mandu near Tanjong Pagar | Preserve Korean context. |
| Singapore dumpling soup near Bugis | Preserve Singapore/local context. |
| Chinese dumplings near Chinatown | Preserve Chinese cuisine context. |
| banana leaf rice | Treat as dish/local food term, not generic banana/rice wording. |
| laksa | Preserve recognised dish name. |
| satay | Preserve recognised dish name. |
| claypot rice | Translate carefully; may require explanatory wording. |
| Peranakan | Preserve cultural/cuisine identity. |
| hawker centre | Singapore-specific context; do not reduce to generic food court unless explaining. |

## Priority 3 — Practical planning terms

| Term | Review note |
|---|---|
| quick lunch | Practical intent, not cuisine. |
| solo dinner | Practical dining situation. |
| late supper | Time-of-day concept varies by language/culture. |
| backup options | Planning concept for alternatives. |
| opening hours | Must remain practical and verifiable. |
| verify before going | Safety/caution phrase; keep clear and user-facing. |

## Review method

For each target language:

1. Check whether the term is a product term, food term, command, caution phrase, or ordinary prose.
2. Preserve commands and help IDs unchanged.
3. Preserve product names unless the glossary says otherwise.
4. Translate food examples by intended search meaning.
5. Add native-script food names where they improve recognition.
6. Avoid claims that set meals, live data, or availability are guaranteed.

## Output expected later

Future translation branches should add per-language food-term notes such as:

```text
docs/UserManual/l10n/zh/food-term-notes.md
docs/UserManual/l10n/ja/food-term-notes.md
docs/UserManual/l10n/id/food-term-notes.md
```
