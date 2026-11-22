# Soleat Food-Term Translation Policy

## Purpose

Soleat search and documentation must preserve food meaning across languages, cuisines, and local usage.

The goal is not to translate every food term word-for-word. The goal is to help users search, recognise, understand, and choose food accurately.

## Core rule

Food terms are meaning-sensitive.

A translated word may be correct linguistically but wrong for food search intent.

Example:

```text
Chinese dumplings
Singapore dumpling soup
Japanese gyoza
Korean mandu
```

These should not be collapsed into one generic result simply because they can be described with the broad English word “dumpling”.

## Terms requiring special care

Review these separately from ordinary prose:

- cuisine names;
- dish names;
- native-script dish names;
- dialect or local food names;
- cooking methods;
- ingredients;
- hawker food names;
- recognised-source names;
- region-specific food terms;
- set-meal or menu-format terms.

## Translation workflow

1. Lock the English master manual.
2. Lock the terminology glossary.
3. Identify non-translatable product terms.
4. Identify food terms requiring local meaning review.
5. Translate UI and prose.
6. Review food terms separately.
7. Review examples and search phrases.
8. Publish translated pages.

## Product names

Do not translate product names unless explicitly approved.

Examples:

- Soleat
- Sketchbook / Clipboard, unless a localised UI label is officially adopted.

## Search examples

Search examples should preserve intent.

Bad:

```text
Translate every example directly even if the dish meaning changes.
```

Better:

```text
Use an equivalent local example only when it preserves search intent and cuisine context.
```

## Native script

When a dish is commonly recognised in native script, preserve or include the native-script form where supported.

This is especially important for Chinese, Japanese, Korean, Thai, Vietnamese, Singaporean, Peranakan, and dialect-linked food names.

## Review warning

Never publish translated food-search examples without checking that the translated term still points to the intended dish, cuisine, or search behaviour.
