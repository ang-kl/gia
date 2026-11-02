---
flow: spec
title: "Train Mini App: the simulation caption moves from a pill over the map into the header band, beside the weather strip"
act: "directive"
force: "MUST"
scope:
  - "web/transport/src/App.jsx"
  - "web/transport/src/components/MrtMapPanel.jsx"
  - "web/transport/src/lib/train-sim.js"
  - "__tests__/train-sim.test.js"
  - "package.json"
  - "doc/Feature/2026-11-02-train-sim-caption-in-header-band.spec.md"
  - "doc/Feature/2026-10-30-simulated-trains-train-tma.spec.md"
  - "doc/Journal/journal-0_62_798-26_08_26-2019.md"
  - "doc/.serial-state.yml"
verify: ""
---

# Train Mini App: the simulation caption moves into the header band

Version: 0.1. Date: 2 November 2026 (Asia/Singapore). Location: `doc/Feature/` (standing exception). Ships as
**v0.62.966**.

## Intent
- Outcome: while "🚆 Simulated" is on, the line "Simulated from the published timetable, not live train positions" (and,
  when no trains are drawn, the reason) shows as a strip in the header band, in the same place and style as the
  weather alert strip, and no longer as a pill floating over the map.
- Force: MUST. Operator, 02-11 '26, with a screenshot of the pill over Boon Keng: *"the message 'Simulated from the
  published timetable, not live train positions' should be like the weather alert and not a separate like this."*
  Then: *"draft the simulation caption spec, §A"* (№ 4,419 §A).
- Done when:
  - `train-sim.test.js` passes with the one pill check changed (below);
  - the suite is green and the Train app builds;
  - a headless render of the built Train app shows, with the toggle on, the strip in the header band and no pill over
    the map; with the toggle off, neither; ✕ hides it, and toggling off and on brings it back.

## Interpretation
- UNDERSTANDING (measured 02-11, read-only):
  - **Where the pill is.** `MrtMapPanel.jsx:1147-1155` renders `{simOn && (<div data-sim-caption=… role="status"
    className="absolute left-12 right-2 top-[6.5rem] …">` over the map, with a second line (`paused`, `outOfHours`,
    `noData`, `noLine`) when nothing is drawn. The trains spec's C6 put it there ("a fixed caption while on") and
    I4 pinned it: `__tests__/train-sim.test.js:220-223` expects `/\{simOn && \(\s*<div[^>]*data-sim-caption/` in
    that file.
  - **Where the weather alert is.** `OutsideNowStrip` is the last child of the Train `<header>` (`App.jsx:634`): a
    rounded, tinted strip, `role="status"`, `margin: 6px 8px 0`, `padding: 7px 10px`, `fontSize: 12`, an icon, the
    text, and a ✕ that dismisses it for the session.
  - **The toggle state lives in the map panel.** `simOn` and `simStatus` are `useState` / derived values inside
    `MrtMapPanel` (`:276`, `:289`), and the header is rendered by `App.jsx`. The header cannot read them today.
  - **Strings.** The caption and the four reasons are in `SIM_STRINGS` (`train-sim.js`), 9 locales, outside the Train
    `i18n.js`, which `tma-i18n-korean.test.js:45` pins at 123 keys. Nothing new to translate.
  - The tapped-train bubble also carries the caption (`MrtMapPanel.jsx:315`). It is a different surface.
- **Choices this spec makes (approving it accepts them; say if any should change):**
  - C1 — **The map panel reports, the header renders.** `MrtMapPanel` gains an `onSimChange({ on, status })`
    prop, called whenever `simOn` or `simStatus` changes. `App.jsx` holds `{ on, status }` in state and renders a
    `SimCaptionStrip` right after `OutsideNowStrip`, inside the header. The toggle itself stays in the map's row
    (trains spec C2).
  - C2 — **Same shape as the weather strip, its own tone.** `SimCaptionStrip` lives in `train-sim.js` beside the
    strings (no React is imported there today; it becomes a small `.jsx`-free render helper returning the same
    `div` shape the weather strip uses: `role="status"`, `data-sim-strip={status}`, the same margin, padding, radius
    and font size). Tone: a neutral blue-grey (`#e8eef7` on `#2b4a6f`), not one of the five warning tones, with 🚆.
  - C3 — **Dismissable, like the weather strip.** A ✕ hides it for the session, as `OutsideNowStrip` does with a
    warning. Turning the toggle off and on again brings it back. The tapped-train bubble still says "simulated"
    (trains spec C6), so a dismissed strip never leaves a train unlabelled. Operator, 02-11 '26, choosing between
    stated options: *"Yes, a ✕ like the weather strip"*.
  - C4 — **Both lines move.** The caption, and the reason line when `status !== 'running'` (`paused`, `outOfHours`,
    `noData`, `noLine`), exactly as the pill shows them today.
  - C5 — **The pill goes.** `MrtMapPanel.jsx:1147-1155` is removed. The bubble's caption on a tapped train stays.
  - C6 — **The trains spec is amended, not rewritten.** Its C6 line "A fixed caption while on" gains an amendment
    saying where the caption lives from this version; I4's check moves with it.
  - C7 — **One existing check changes (F7, stated now).** `__tests__/train-sim.test.js:220-223` "the caption is shown
    whenever the toggle is on, whatever the state" asserts the pill in `MrtMapPanel.jsx`. It will assert instead that
    `MrtMapPanel` reports `onSimChange` and that `App.jsx` renders `SimCaptionStrip` under `OutsideNowStrip`, and
    that no `data-sim-caption` pill remains. Every other check in the file is unchanged. The edit is quoted in the
    journal.
- GAPS: none that change the outcome, given C1-C7.

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | The strip has a ✕ that hides it for the session, like the weather strip (C3) | corrected | First drafted as "no ✕". Operator, 02-11 '26, choosing between stated options: *"Yes, a ✕ like the weather strip"*. The tapped-train bubble keeps its own "simulated" line, so a dismissed strip never leaves a train unlabelled |
| A2 | The strip has its own neutral tone, not a warning colour (C2) | confirmed | Operator, 02-11 '26, choosing between stated options: *"Neutral blue-grey (Recommended)"* |

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | While the toggle is on, the caption is in the header band; while off, nowhere | `App.jsx`, `MrtMapPanel.jsx` | the tapped-train bubble keeps its own line | a train read as live | `train-sim.test.js` (source pins) and the headless render, toggle on and off |
| I2 | No pill is drawn over the map any more | `MrtMapPanel.jsx` | none | two captions | `train-sim.test.js`: no `data-sim-caption`; the render finds no `[data-sim-caption]` |
| I3 | The reason line still shows when no trains are drawn | `train-sim.js`, `App.jsx` | none | a silent empty map | `train-sim.test.js`: the helper renders `paused` / `outOfHours` / `noData` / `noLine` |
| I4 | The strip's ✕ hides it for the session only; the toggle going off and on brings it back; the 9-locale strings are unchanged | `train-sim.js`, `App.jsx` | none | a label gone for good, or an English fallback | `train-sim.test.js`: the ✕ calls the dismiss, the toggle resets it; `simT` unchanged |
| I5 | The toggle still resets on reopen; the Train `i18n.js` is untouched; the suite passes; the Train app builds | suite, build | none | a broken map row | existing C2 and string-table checks unedited; `npm test`; `vite build` for transport |

## Acceptance criteria
- [ ] Tests written first and red → I1-I4
- [ ] `onSimChange`, `SimCaptionStrip`, the header render, the pill removed → I1-I5
- [ ] Mutations, each proved applied and restored, all caught: the pill put back; the strip rendered regardless of
      the toggle; the reason line dropped; the ✕ dropped; the dismissal surviving the toggle going off and on;
      `onSimChange` never called
- [ ] Headless render of the built Train app: toggle on → strip in the header, no pill; toggle off → neither;
      the paused state → the second line
- [ ] Full suite green; Train build; `package.json` bumped to 0.62.966
- [ ] Trains spec amended (C6)

## Out of scope
- The toggle's place and behaviour (trains spec C1, C2).
- The tapped-train bubble.
- Hawker and Cuisine, which draw no trains.

## Evidence
Filled at the end: INVARIANTS REPORT, verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
