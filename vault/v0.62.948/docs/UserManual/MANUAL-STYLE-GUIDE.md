# Soleat User Manual Style Guide

## Purpose

This guide keeps the Soleat User Manual consistent, user-facing, and safe from overclaiming.

## Audience

Write for ordinary Soleat users, not developers, operators, or maintainers.

The user may be:

- a sole eater deciding where to eat now;
- a curious eater exploring a cuisine or dish;
- a planner saving places for a trip, day, event, or food trail;
- a Singapore user checking local transport, bus, car park, weather, and hawker context;
- a cross-border or travel user using selected supported regions.

## Voice and tone

Use a calm, practical, helpful tone.

Prefer:

```text
Use this when you want to compare food places with nearby transport and car park context.
```

Avoid:

```text
This feature will always find the best food place for you.
```

## User-facing terms

Use these terms consistently:

- Soleat
- Soleat Menu
- Cuisine Search
- Food Search
- Eatery Card
- Google Map View
- Recognised Venues
- Hidden Gems
- Singapore Hawker Centres & Food Centres
- Singapore Train Network / Transport
- Singapore Train Station Exits
- Singapore Bus Information
- Singapore Car Parks
- Sketchbook / Clipboard
- Catch-all
- Cabinet
- Drawer
- Card

## Terms to avoid in user-facing manual text

Avoid implementation and internal terms unless writing developer documentation:

- repo path names
- source-code filenames
- handler names
- endpoint names
- PR numbers
- journal names
- feature-stocktake language
- owner-only commands
- admin-only commands
- diagnostics or logging details

## Overclaiming rules

Use cautious wording when feature behaviour may depend on region, data, live service status, or availability.

Prefer:

```text
where available
may show
can help
use as a decision aid
verify critical timing
```

Avoid:

```text
always shows
guarantees
confirms every time
works everywhere
```

## Translation rules

Do not treat food terms as ordinary prose.

Food terms, cuisine names, dish names, native-script names, and local usage require meaning-aware review.

Example:

```text
Chinese dumplings
Singapore dumpling soup
Japanese gyoza
Korean mandu
```

These may be related, but they are not the same search intent.

## Chapter structure

Most feature chapters should follow this shape:

1. What it is
2. When to use it
3. How to start
4. What to look for
5. Tips
6. Related features

## Help integration rule

Every major feature, screen, state, or workflow that may need contextual help should receive a stable `helpId` in `help-registry.seed.json`.

Do not wire app code to these help IDs until the ID names and anchors are reviewed.
