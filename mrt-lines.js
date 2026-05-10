// mrt-lines.js — v0.51.0 single source of truth for SG MRT line metadata.
//
// Used by /transport text view, the new transport TMA, and the
// disruption parser. Colours match the official LTA palette.

// v0.60.75 — `headway` block per line. Static published values from
// LTA's service standards (2026 timetable). Format:
//   { peak: '2-3', offpeak: '5-7' } → "2-3 min peak · 5-7 min off-peak"
// Surfaced in /transport train chat as a network-level frequency
// footer so users know what to expect even though LTA doesn't expose
// per-train arrival times publicly.
const LINES = [
  { code: 'EWL',  name: 'East-West Line',         hex: '#009645', emoji: '🟢', endpoints: ['Tuas Link', 'Pasir Ris'],         headway: { peak: '2-3', offpeak: '5-7' } },
  { code: 'CGL',  name: 'Changi Airport Branch',  hex: '#009645', emoji: '🟢', endpoints: ['Tanah Merah', 'Changi Airport'],  parent: 'EWL', headway: { peak: '7-8', offpeak: '12-14' } },
  { code: 'NSL',  name: 'North-South Line',       hex: '#D42E12', emoji: '🔴', endpoints: ['Jurong East', 'Marina South Pier'], headway: { peak: '2-3', offpeak: '5-7' } },
  { code: 'NEL',  name: 'North-East Line',        hex: '#9900AA', emoji: '🟣', endpoints: ['HarbourFront', 'Punggol'],         headway: { peak: '2-4', offpeak: '5-8' } },
  { code: 'CCL',  name: 'Circle Line',            hex: '#FA9E0D', emoji: '🟠', endpoints: ['Dhoby Ghaut', 'HarbourFront (loop)'], headway: { peak: '3-4', offpeak: '6-8' } },
  { code: 'DTL',  name: 'Downtown Line',          hex: '#005EC4', emoji: '🔵', endpoints: ['Bukit Panjang', 'Expo'],           headway: { peak: '2-3', offpeak: '5-7' } },
  { code: 'TEL',  name: 'Thomson-East Coast',     hex: '#9D5B25', emoji: '🟤', endpoints: ['Woodlands North', 'Bayshore'],     headway: { peak: '3-4', offpeak: '5-7' } },
  { code: 'JRL',  name: 'Jurong Region Line',     hex: '#0099AA', emoji: '🔷', endpoints: ['Choa Chu Kang', 'Pandan Reservoir'], future: true },
  { code: 'CRL',  name: 'Cross Island Line',      hex: '#97C616', emoji: '🟢', endpoints: ['Aviation Park', 'Bright Hill'],    future: true },
  { code: 'BPL',  name: 'Bukit Panjang LRT',      hex: '#718472', emoji: '⚪', endpoints: ['Choa Chu Kang', 'Bukit Panjang'], headway: { peak: '4-5', offpeak: '6-8' } },
  { code: 'SLRT', name: 'Sengkang LRT',           hex: '#718472', emoji: '⚪', endpoints: ['Sengkang', '(loop)'],             headway: { peak: '3-4', offpeak: '5-8' } },
  { code: 'PLRT', name: 'Punggol LRT',            hex: '#718472', emoji: '⚪', endpoints: ['Punggol', '(loop)'],              headway: { peak: '3-4', offpeak: '5-8' } }
];

// Compute the network-wide min / max headway for the static footer
// surfaced in /transport train. Skips future lines (JRL, CRL) and
// the airport branch (CGL) which has its own published 7-min cycle.
function networkHeadwayRange() {
  const operating = LINES.filter((l) => l.headway && !l.future && !l.parent);
  let pkMin = Infinity, pkMax = 0, opMin = Infinity, opMax = 0;
  for (const l of operating) {
    const [pa, pb] = l.headway.peak.split('-').map(Number);
    const [oa, ob] = l.headway.offpeak.split('-').map(Number);
    if (pa < pkMin) pkMin = pa;
    if (pb > pkMax) pkMax = pb;
    if (oa < opMin) opMin = oa;
    if (ob > opMax) opMax = ob;
  }
  return { peakMin: pkMin, peakMax: pkMax, offMin: opMin, offMax: opMax };
}

const LINES_BY_CODE = LINES.reduce((m, l) => { m[l.code] = l; return m; }, {});

// Heuristic: extract affected line codes from an LTA TrainServiceAlerts
// Message.Content blob. LTA's text varies — may say "EWL", "East West
// Line", "circle line", etc. We match all known synonyms.
const LINE_SYNONYMS = [
  ['EWL',  /\b(ewl|east[\s-]?west\s+line|east[\s-]?west|ewline)\b/i],
  ['CGL',  /\b(cgl|changi\s+airport\s+(branch|line)|changi\s+branch)\b/i],
  ['NSL',  /\b(nsl|north[\s-]?south\s+line|north[\s-]?south)\b/i],
  ['NEL',  /\b(nel|north[\s-]?east\s+line|north[\s-]?east|nelline)\b/i],
  ['CCL',  /\b(ccl|circle\s+line|circle)\b/i],
  ['DTL',  /\b(dtl|downtown\s+line|downtown)\b/i],
  ['TEL',  /\b(tel|thomson[\s-]?east(\s+coast)?\s+line|thomson|thomson[\s-]?east)\b/i],
  ['BPL',  /\b(bplrt|bp\s*lrt|bukit\s+panjang\s+lrt)\b/i],
  ['SLRT', /\b(sklrt|sk\s*lrt|sengkang\s+lrt)\b/i],
  ['PLRT', /\b(pglrt|pg\s*lrt|punggol\s+lrt)\b/i]
];

function affectedLines(text) {
  if (!text) return [];
  const hits = new Set();
  for (const [code, re] of LINE_SYNONYMS) {
    if (re.test(text)) hits.add(code);
  }
  return [...hits];
}

// Parse the LTA TrainServiceAlerts payload (already cached in
// `lta:train_status` redis key) into a per-line status table.
//
// Input: { Status: 1|2, Message: [{Content, CreatedDate}, ...] }
// Output: Map<lineCode, {status, cause, direction, time, raw}>
//
// Status: 'normal' | 'delay' | 'disrupted' | 'closure'
function parseStatusByLine(rawAlerts) {
  const byLine = {};
  for (const l of LINES) byLine[l.code] = { status: 'normal', cause: '', direction: '', time: '', raw: '' };
  if (!rawAlerts || rawAlerts.Status === 1) return byLine; // healthy
  const messages = Array.isArray(rawAlerts.Message) ? rawAlerts.Message : [];
  for (const m of messages) {
    const content = String(m?.Content || '');
    const lines = affectedLines(content);
    if (!lines.length) continue;
    const status = /\bclosure|closed\b/i.test(content) ? 'closure'
      : /\bdisrupt|service[\s-]?suspended\b/i.test(content) ? 'disrupted'
      : /\bdelay|slow|major delay\b/i.test(content) ? 'delay'
      : 'delay';
    const cause = (content.match(/(signal[\s-]?fault|track[\s-]?fault|train[\s-]?fault|power[\s-]?fault|engineering|maintenance|signalling|incident|investigation)/i) || [])[1] || 'See LTA';
    const dirMatch = content.match(/(?:between|from|to)\s+([A-Z][\w\s]+?)\s+(?:and|to|→|-)\s+([A-Z][\w\s]+?)(?:\s|$|\.|,)/);
    const direction = dirMatch ? `${dirMatch[1].trim()} ↔ ${dirMatch[2].trim()}` : '';
    for (const code of lines) {
      // Most-severe-wins
      const prev = byLine[code];
      const sev = { normal: 0, delay: 1, disrupted: 2, closure: 3 };
      if (sev[status] > sev[prev.status]) {
        byLine[code] = { status, cause, direction, time: m?.CreatedDate || '', raw: content.slice(0, 200) };
      }
    }
  }
  return byLine;
}

module.exports = {
  LINES,
  LINES_BY_CODE,
  LINE_SYNONYMS,
  affectedLines,
  parseStatusByLine,
  networkHeadwayRange
};
