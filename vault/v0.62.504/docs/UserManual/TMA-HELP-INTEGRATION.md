# Soleat TMA Help Integration

## Purpose

This note explains how the Soleat User Manual can later support contextual help inside Telegram Mini Apps.

The manual should not remain only a long document. Each major feature, screen, state, or workflow should be referenceable through a stable `helpId`.

## Basic pattern

```text
TMA screen, button, card, empty state, or workflow
        ↓
helpId
        ↓
help-registry.seed.json
        ↓
manual section / paragraph / image / step
        ↓
help drawer, modal, or manual page
```

## Example help IDs

```text
help.soleat.cuisine.overview
help.soleat.results.eatery-card
help.soleat.map.layers
help.soleat.transport.station-exits
help.soleat.transport.bus-information
help.soleat.sketchbook.structure
help.soleat.troubleshooting.common-problems
```

## Help levels

Use three levels of help later:

1. Quick Help — one short explanation inside the TMA.
2. Guided Help — steps with screenshots or diagrams.
3. Full Manual — open the full manual section.

## Help registry

The current registry is a seed file, not yet a stable app contract:

```text
docs/UserManual/help-registry.seed.json
```

Before wiring into app code, review:

- help ID names;
- target anchors;
- missing help states;
- image needs;
- translation needs;
- whether each help item should appear as quick help, guided help, or full manual help.

## Future image registry

Future screenshots should use stable IDs, for example:

```text
img.soleat.cuisine.eatery-card-annotated
img.soleat.map.layers-control
img.soleat.transport.station-exits
img.soleat.clipboard.cabinet-drawer-card
```

Each image should have alt text and a list of related help IDs.

## Rule

Do not wire TMA help buttons to unstable headings. Wire them to stable help IDs only after the registry has been reviewed.
