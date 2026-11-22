#!/usr/bin/env node
'use strict';

// scripts/build-train-sim.js — v0.62.961. Builds web/transport/src/data/train-sim.json, the timetable the Train Mini
// App's "🚆 Simulated" toggle runs on.
//
// Spec: doc/Feature/2026-10-30-simulated-trains-train-tma.spec.md, C3 and I1. The ONLY input is
// data/sg_train_timings.json (the operators' first/last-train times per station, scraped 20-05 '26). For each line with
// per-station times it records:
//   - `stations`: the codes in running order, from the direction with the most stations (ties: the one starting at the
//     lower station number);
//   - `runSec`: one run time per segment. A segment's time is the first-train step between its two stations, in
//     either direction, when that step is positive; otherwise the line's median positive step; otherwise 2 minutes.
//     First-train times are not one train's run (some lines start mid-line from depots, which shows as negative
//     steps), hence the fallbacks. `src` says which rule gave each: t(imetable), m(edian), d(efault);
//   - `window`: the service window in minutes after the service day's midnight, `[earliest first, latest last]`, for
//     weekdays and weekends. Times before 03:00 count past 24:00.
// Lines with no per-station times (the Sengkang and Punggol LRTs, the Changi Airport branch) are left out (C3).
//
// Deterministic: no timestamps, so a rebuild equals the committed file. Writes only when run directly.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'sg_train_timings.json');
const OUT = path.join(__dirname, '..', 'web', 'transport', 'src', 'data', 'train-sim.json');
const LINE_CODE = { DTL: 'DTL', NEL: 'NEL', NSL: 'NSL', EWL: 'EWL', CCL: 'CCL', TEL: 'TEL', BP_LRT: 'BPL' };
const DEFAULT_SEC = 120;
const NUM = (c) => Number(String(c).replace(/^\D+/, '')) || 0;

function parseClock(s) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(s || '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  let min = h * 60 + Number(m[2]);
  if (min < 180) min += 1440; // after-midnight last trains belong to the service day before
  return min;
}

const firstWeekday = (s) => parseClock(s.first_weekday || s.first_mon_sat);
const firstWeekend = (s) => parseClock(s.first_weekend || s.first_sun_ph || s.first_sat);
const lastWeekday = (s) => parseClock(s.last_weekday || s.last_daily);
const lastWeekend = (s) => parseClock(s.last_weekend || s.last_weekend_ph || s.last_daily);

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildLine(dirs) {
  const withStations = dirs.filter((d) => Array.isArray(d.stations) && d.stations.length > 1);
  if (!withStations.length) return null;
  withStations.sort((a, b) => (b.stations.length - a.stations.length) || (NUM(a.stations[0].code) - NUM(b.stations[0].code)));
  const main = withStations[0].stations;
  const stations = main.map((s) => s.code);
  // Positive first-train steps, keyed by unordered station pair, from every direction.
  const steps = new Map();
  const all = [];
  for (const d of withStations) {
    for (let i = 0; i + 1 < d.stations.length; i++) {
      const a = firstWeekday(d.stations[i]);
      const b = firstWeekday(d.stations[i + 1]);
      if (a == null || b == null || b - a <= 0) continue;
      const sec = (b - a) * 60;
      const key = [d.stations[i].code, d.stations[i + 1].code].sort().join('|');
      if (!steps.has(key)) steps.set(key, sec);
      all.push(sec);
    }
  }
  const med = median(all);
  const runSec = [];
  const src = [];
  for (let i = 0; i + 1 < stations.length; i++) {
    const key = [stations[i], stations[i + 1]].sort().join('|');
    if (steps.has(key)) { runSec.push(steps.get(key)); src.push('t'); }
    else if (med != null) { runSec.push(med); src.push('m'); }
    else { runSec.push(DEFAULT_SEC); src.push('d'); }
  }
  const every = withStations.flatMap((d) => d.stations);
  const span = (first, last) => {
    const f = every.map(first).filter((x) => x != null);
    const l = every.map(last).filter((x) => x != null);
    return f.length && l.length ? [Math.min(...f), Math.max(...l)] : null;
  };
  return { stations, runSec, src, window: { weekday: span(firstWeekday, lastWeekday), weekend: span(firstWeekend, lastWeekend) } };
}

function buildTrainSim(timings) {
  const lines = {};
  for (const [key, line] of Object.entries((timings && timings.lines) || {})) {
    const code = LINE_CODE[key];
    if (!code) continue;
    const built = buildLine(Object.values(line.directions || {}));
    if (built && built.window.weekday && built.window.weekend) lines[code] = built;
  }
  return {
    _meta: {
      source: 'data/sg_train_timings.json',
      scrapedOn: (timings && timings.metadata && timings.metadata.scraped_on) || null,
      builtBy: 'scripts/build-train-sim.js',
      note: 'Timetable for a SIMULATION. Run times come from first-train steps and are approximate; no live positions.',
    },
    lines,
  };
}

if (require.main === module) {
  const out = buildTrainSim(JSON.parse(fs.readFileSync(SRC, 'utf8')));
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
  for (const [k, l] of Object.entries(out.lines)) {
    const n = (c) => l.src.filter((x) => x === c).length;
    console.log(`${k}: ${l.stations.length} stations, ${n('t')} timetable / ${n('m')} median / ${n('d')} default, weekday ${l.window.weekday}, weekend ${l.window.weekend}`);
  }
}

module.exports = { buildTrainSim, parseClock };
