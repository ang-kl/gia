// Client-side mirror of mrt-lines.js (kept in sync manually; small list).
// Used by the TMA to render line badges + colour-code the schematic.

export const LINES = [
  { code: 'EWL',  name: 'East-West Line',         hex: '#009645', endpoints: ['Tuas Link', 'Pasir Ris'] },
  { code: 'CGL',  name: 'Changi Airport Branch',  hex: '#009645', endpoints: ['Tanah Merah', 'Changi Airport'], parent: 'EWL' },
  { code: 'NSL',  name: 'North-South Line',       hex: '#D42E12', endpoints: ['Jurong East', 'Marina South Pier'] },
  { code: 'NEL',  name: 'North-East Line',        hex: '#9900AA', endpoints: ['HarbourFront', 'Punggol'] },
  { code: 'CCL',  name: 'Circle Line',            hex: '#FA9E0D', endpoints: ['Dhoby Ghaut', 'HarbourFront (loop)'] },
  { code: 'DTL',  name: 'Downtown Line',          hex: '#005EC4', endpoints: ['Bukit Panjang', 'Expo'] },
  { code: 'TEL',  name: 'Thomson-East Coast',     hex: '#9D5B25', endpoints: ['Woodlands North', 'Bayshore'] },
  { code: 'BPL',  name: 'Bukit Panjang LRT',      hex: '#718472', endpoints: ['Choa Chu Kang', 'Bukit Panjang'] },
  { code: 'SLRT', name: 'Sengkang LRT',           hex: '#718472', endpoints: ['Sengkang', '(loop)'] },
  { code: 'PLRT', name: 'Punggol LRT',            hex: '#718472', endpoints: ['Punggol', '(loop)'] },
  // v0.60.230 — future lines, added so Build E 5a polylines can colour
  // the JRL / CRL station geometry already present in mrt-coords.json.
  { code: 'JRL',  name: 'Jurong Region Line',     hex: '#0099AA', endpoints: ['Choa Chu Kang', 'Pandan Reservoir'], future: true },
  { code: 'CRL',  name: 'Cross Island Line',      hex: '#97C616', endpoints: ['Aviation Park', 'Bright Hill'], future: true }
];

export const LINES_BY_CODE = LINES.reduce((m, l) => { m[l.code] = l; return m; }, {});
