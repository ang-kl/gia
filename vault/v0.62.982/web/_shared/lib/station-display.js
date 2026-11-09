// station-display.js — v0.62.911
//
// ONE answer to "what does this station read as, in this locale?", for every surface that shows a
// station name: the map pill, the map info card, and anything else that used to build the string
// by hand.
//
// WHY IT EXISTS. The three mapOverlays.js copies each carried
//
//     nm.textContent = (nice + ' station').trim();
//
// — a raw English name with an English word welded to it, in every locale, on every map in all
// three Mini Apps. Two lines away in the same file the info card called `scLabel('station', lang,
// { name })`, which localises the TEMPLATE (`{name}站`, `{name}역`) and then interpolates the same
// raw English name, so a Chinese reader got `Simei站` where the government register says 四美地铁站.
// Meanwhile `MrtMapPanel.jsx` had been calling `stationName()` correctly all along. Three
// renderings of one fact, one of them right.
//
// ⚠ THE REGISTER FORM IS ALREADY COMPLETE — DO NOT WRAP IT. `stationName('Simei','zh')` returns
// 四美地铁站, which already ends in 站. Passing that through `scLabel('station', 'zh', …)`, whose
// template is `{name}站`, yields 四美地铁站站. So the precedence is: if the official register
// answered, that string IS the answer and nothing is appended. Only when it did not do we fall to
// the local table plus the localised template. This is the same rule `name-second-line.js:13-15`
// writes down for the bracketed second line, applied to the primary instead.

import { stationName } from './mrt-stations-i18n.generated.js';
import { stationNameLocal } from './mrt-stations-i18n.local.generated.js';
import { scLabel } from './station-card-labels.js';

/** Capitalise the way the old inline code did, so English output is byte-identical to before. */
function nicely(name) {
  const s = String(name || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * The station's display name in `lang` — the whole label, including the word "Station" where the
 * locale wants one. Returns '' for an empty name.
 */
export function stationDisplay(name, lang) {
  const nice = nicely(name);
  if (!nice) return '';
  const l = lang || 'en';
  // 1. The official register (zh / ms / ta). Complete as-is; never wrapped.
  const official = stationName(nice, l);
  if (official && official !== nice) return official;
  // 2. The local table (es / fr / de / ru / ja / ko) supplies the NAME; the template supplies the
  //    word around it. A reading and a translation are both fine here — either is closer to the
  //    reader than the English, and the bracketed-guide distinction only matters on a SECOND line.
  const local = stationNameLocal(nice, l);
  const base = (local && local.text) || nice;
  return scLabel('station', l, { name: base });
}

/**
 * ⚠ Whether `stationDisplay` actually reached the reader's language, rather than falling through
 * to an English name inside a localised template. Callers that want to add a bracketed second line
 * use this to avoid printing a bracket under a line that never changed — the noise
 * `StationCard.jsx:454-460` warned about.
 */
export function stationDisplayIsLocal(name, lang) {
  const nice = nicely(name);
  if (!nice || !lang || lang === 'en') return false;
  const official = stationName(nice, lang);
  if (official && official !== nice) return true;
  return !!stationNameLocal(nice, lang);
}
