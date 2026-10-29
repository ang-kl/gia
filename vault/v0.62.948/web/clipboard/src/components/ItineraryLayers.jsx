// ItineraryLayers — the layer panel.
//
// A Sketchbook drawer IS a time slot, so this control is the day itself, not
// a bag of toggles. The first cut was a flat wrapped row of checkboxes and
// the operator rejected it: "checkbox's alignment and groupings lacking and
// not following realistic drawer's purpose."
//
// What that means concretely:
//   · drawers in CLOCK order, nested under their segments.js day-part
//   · each day-part owns a parent checkbox — what a person skips is an
//     afternoon, not an arbitrary subset
//   · a part that is partly on renders INDETERMINATE, so a half-ticked
//     Evening cannot read as "Evening is off"
//   · a part with no drawers is not rendered at all — never an empty row
//     waiting to be filled
//   · the span on each part header is COMPUTED from the drawers inside it,
//     so it stays true when the drawer set changes
//   · `wholeDay` reads "Anytime" and is not on the clock, so it gets its own
//     trailing section instead of pretending to be an evening
//
// The leading mark on a drawer row is the map's actual pin — same fill, same
// number, same circle. A neutral swatch would have been a second vocabulary
// to learn.
//
// Alignment: every checkbox sits in its own 40px column (see .gia-m3cb), so
// parents, children and map layers land on shared vertical centrelines.

import React from 'react';
import M3Checkbox from './M3Checkbox.jsx';
import { t } from '../lib/i18n.js';

const PART_KEY = {
  morning: 'itin.part.morning', midday: 'itin.part.midday',
  evening: 'itin.part.evening', night: 'itin.part.night', anytime: 'itin.part.anytime'
};

export default function ItineraryLayers({
  parts, layers, onToggleLayer, drawerOn, onToggleDrawer, onTogglePart, lang
}) {
  const LAYER_ROWS = [
    ['zones', t('itin.layer.zones', lang)],
    ['legs', t('itin.layer.legs', lang)],
    ['pins', t('itin.layer.pins', lang)],
    ['anchors', t('itin.layer.anchors', lang)]
  ];

  return (
    <details className="gia-itin-layers bg-tg-card border border-tg-border rounded-xl px-2.5 py-2 mb-2" open>
      <summary className="text-xs font-semibold cursor-pointer list-none">{t('itin.showOnMap', lang)}</summary>

      <div className="mt-2">
        <h4 className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-tg-hint mb-0.5">{t('itin.theDay', lang)}</h4>
        {parts.map((p) => {
          const on = p.items.filter((d) => drawerOn[d.idx]).length;
          return (
            <div key={p.key}>
              <label className="gia-itin-row is-part">
                <M3Checkbox
                  checked={on === p.items.length}
                  indeterminate={on > 0 && on < p.items.length}
                  ariaLabel={t(PART_KEY[p.key], lang)}
                  onChange={(v) => onTogglePart(p, v)}
                />
                <span className="flex-1 min-w-0 font-mono text-[10px] font-bold tracking-[0.08em] uppercase truncate">
                  {t(PART_KEY[p.key], lang)}
                </span>
                {p.span && (
                  <span className="flex-none ml-2 pr-1 font-mono text-[10px] text-tg-hint tabular-nums">
                    {p.span[0]} – {p.span[1]}
                  </span>
                )}
              </label>

              <div className="gia-itin-kids">
                {p.items.map((d) => {
                  const missing = d.stops.length - d.mapped;
                  const off = !drawerOn[d.idx];
                  return (
                    <label key={d.idx} className={`gia-itin-row ${off ? 'opacity-60' : ''}`}>
                      <M3Checkbox
                        checked={!off}
                        ariaLabel={d.name}
                        onChange={(v) => onToggleDrawer(d.idx, v)}
                      />
                      <i
                        className="flex-none w-[22px] h-[22px] rounded-full mr-2 grid place-items-center font-mono text-[10px] font-bold text-white not-italic"
                        style={{ background: d.color, filter: off ? 'grayscale(1)' : 'none' }}
                        aria-hidden
                      >{d.idx + 1}</i>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-[12.5px] font-medium truncate">{d.emoji} {d.name}</span>
                        <span className="font-mono text-[9.5px] text-tg-hint">{d.time}</span>
                      </span>
                      <span
                        className="flex-none ml-2 pr-1 font-mono text-[10px] text-tg-hint tabular-nums"
                        title={t('itin.countTitle', lang, { mapped: d.mapped, missing })}
                      >
                        {d.mapped}{missing > 0 && <b className="text-sk-pin font-normal"> +{missing}</b>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 pt-2 border-t border-tg-border">
        <h4 className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-tg-hint mb-0.5">{t('itin.mapLayers', lang)}</h4>
        {/* Four peers, no hierarchy to show — a flat two-column grid, one
            column on the narrowest phones. */}
        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-x-1">
          {LAYER_ROWS.map(([key, label]) => (
            <label key={key} className="gia-itin-row">
              <M3Checkbox checked={!!layers[key]} ariaLabel={label} onChange={(v) => onToggleLayer(key, v)} />
              <span className="flex-1 min-w-0 text-[12.5px] font-medium truncate">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
