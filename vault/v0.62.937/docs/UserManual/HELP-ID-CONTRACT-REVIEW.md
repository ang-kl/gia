# Soleat Help ID Contract Review

## Purpose

This review prepares the Soleat User Manual for future contextual help inside Telegram Mini Apps.

The current file below is a seed registry, not yet a stable app contract:

```text
docs/UserManual/help-registry.seed.json
```

Before app code uses these IDs, the team should review each help ID as if it will become a stable public contract between the product UI and the documentation system.

## Contract rule

A help ID should be stable even if the manual heading changes.

Good:

```text
help.soleat.transport.station-exits
```

Risky:

```text
help.section.21.4
```

Reason: section numbers and headings may change, but the user-help intent should remain stable.

## Current review status

Status: `draft-contract-review`

The current IDs are acceptable as seed IDs. They should not yet be treated as final app contracts.

## Review checklist

Before wiring TMA help buttons:

- [ ] Confirm every major feature has a help ID.
- [ ] Confirm every major empty state has a help ID.
- [ ] Confirm every major error or recovery state has a help ID.
- [ ] Confirm every major map layer or complex control has a help ID.
- [ ] Confirm every Sketchbook object and workflow has a help ID.
- [ ] Confirm help IDs do not expose implementation names.
- [ ] Confirm help IDs are stable across translation.
- [ ] Confirm target manual anchors exist.
- [ ] Decide which help IDs need screenshots or annotated images.
- [ ] Decide quick-help vs guided-help vs full-manual behaviour.

## Current ID families

### General orientation

```text
help.soleat.overview.*
help.soleat.getting-started
help.soleat.menu.overview
help.soleat.commands.overview
```

Review note: suitable as high-level manual entry points.

### Location

```text
help.soleat.location.overview
help.soleat.location.country-city-saved
```

Review note: may later need separate IDs for current location, typed place, saved locations, and country/city picker if those become separate TMA help states.

### Language and food meaning

```text
help.soleat.language.food-meaning
```

Review note: keep this ID. It is important for translation and food-term disambiguation.

Possible future IDs:

```text
help.soleat.language.interface-language
help.soleat.language.native-script-food-names
help.soleat.language.ambiguous-food-terms
```

### Search and Cuisine Search

```text
help.soleat.search.overview
help.soleat.cuisine.overview
help.soleat.cuisine.what-to-try
help.soleat.search.tips
```

Review note: strong foundation, but Cuisine TMA may later need more granular IDs for filters, result pagination, search insight, weak results, and zero-result recovery.

Possible future IDs:

```text
help.soleat.cuisine.filters
help.soleat.cuisine.weak-results
help.soleat.cuisine.zero-results
help.soleat.cuisine.search-insights
help.soleat.cuisine.local-food-picks
```

### Results and Eatery Cards

```text
help.soleat.results.eatery-card
help.soleat.results.hide-card
```

Review note: useful but likely incomplete for annotated UI help.

Possible future IDs:

```text
help.soleat.results.copy-card
help.soleat.results.copy-all
help.soleat.results.price-fx
help.soleat.results.opening-hours
help.soleat.results.what-to-try
help.soleat.results.recognition-badges
```

### Map

```text
help.soleat.map.overview
help.soleat.map.layers
```

Review note: good seed IDs. If map controls become more complex, add control-level IDs.

Possible future IDs:

```text
help.soleat.map.colour-mode
help.soleat.map.monochrome-mode
help.soleat.map.crowded-map
help.soleat.map.nearby-context
```

### Recognised and Hidden Gems

```text
help.soleat.recognised.overview
help.soleat.hidden.overview
```

Review note: keep recognition as a signal, not guarantee. Hidden Gems should remain discovery-oriented.

Possible future IDs:

```text
help.soleat.recognised.badges
help.soleat.recognised.curated-sources
help.soleat.hidden.discovery-suggestions
```

### Meal options

```text
help.soleat.meal-options.overview
help.soleat.meal-options.opening-hours
```

Review note: wording must continue to avoid promising set-meal availability.

Possible future IDs:

```text
help.soleat.meal-options.set-meal
help.soleat.meal-options.quick-lunch
help.soleat.meal-options.supper
help.soleat.meal-options.verify-menu
```

### Singapore practical context

```text
help.soleat.hawker.overview
help.soleat.transport.overview
help.soleat.transport.station-exits
help.soleat.transport.bus-information
help.soleat.carpark.overview
help.soleat.weather.overview
```

Review note: these IDs are well-named and user-facing. Keep Singapore-specific wording where needed.

Possible future IDs:

```text
help.soleat.hawker.map-overlay
help.soleat.transport.live-arrivals
help.soleat.transport.first-last-train
help.soleat.carpark.live-lots
help.soleat.weather.short-term-forecast
```

### Sketchbook / Clipboard

```text
help.soleat.sketchbook.overview
help.soleat.sketchbook.structure
```

Review note: strong but not enough for full TMA guidance.

Possible future IDs:

```text
help.soleat.sketchbook.catch-all
help.soleat.sketchbook.cabinet
help.soleat.sketchbook.drawer
help.soleat.sketchbook.card
help.soleat.sketchbook.share-drawer
help.soleat.sketchbook.backup-options
```

### Troubleshooting, privacy, and limitations

```text
help.soleat.troubleshooting.common-problems
help.soleat.privacy.overview
help.soleat.support.limitations
```

Review note: keep these as stable anchors for general support.

Possible future IDs:

```text
help.soleat.troubleshooting.mini-app-not-opening
help.soleat.troubleshooting.no-results
help.soleat.troubleshooting.results-too-broad
help.soleat.troubleshooting.map-too-crowded
help.soleat.privacy.forgetme
help.soleat.privacy.saved-locations
```

## Image and screenshot needs

The next documentation pass should identify image needs for:

- Cuisine Search result view;
- Eatery Card annotation;
- Google Map View layers;
- Singapore Train Station Exits;
- Singapore Bus Information near stations;
- Singapore Car Parks;
- Sketchbook structure: Catch-all → Cabinet → Drawer → Card;
- common troubleshooting states.

## Recommendation

Do not wire app help buttons to this registry yet.

Recommended sequence:

```text
1. Expand glossary
2. Review help IDs as contracts
3. Add screenshot/image registry
4. Validate commands against bot command list
5. Lock English master anchors
6. Start translation-prep branch
7. Wire TMA help to stable IDs
```
