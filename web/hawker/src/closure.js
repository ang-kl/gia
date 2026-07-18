// web/hawker/src/closure.js — v0.62.596
//
// Shared cleaning / renovation / redevelopment closure helpers, used by BOTH the
// Hawker card tab (App.jsx renderCentreCard) and the map pin (HawkerMapPanel.jsx),
// so the two never drift. `c.closures` =
//   { cleaning:[{start,end}], renovation:[{start,end}], redevelopment:[{start,end}] }
// (ISO 'YYYY-MM-DD' windows from the NEA closure CSV). A tab + pin recolour shows
// ONLY when TODAY falls inside a window; precedence redevelopment > renovation >
// cleaning (the more significant / longer works win the display).

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function ordinalDay(d) {
  const n = Number(d);
  const v = n % 100;
  const suf = (v >= 11 && v <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  return `${n}${suf}`;
}

// "DDth" when the closure ends THIS month; "DD MMMM" when it runs into a later
// month (+ year when it's a later year, e.g. a multi-year redevelopment till 2029).
export function closureTill(endISO) {
  const [y, m, dd] = String(endISO).split('-').map(Number);
  if (!y || !m || !dd) return '';
  const now = new Date();
  if (y === now.getFullYear() && m - 1 === now.getMonth()) return ordinalDay(dd);
  const base = `${dd} ${MONTHS_EN[m - 1]}`;
  return y === now.getFullYear() ? base : `${base} ${y}`;
}

export function activeClosure(closures) {
  if (!closures) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inWin = (w) => {
    if (!w || !w.start || !w.end) return false;
    const s = new Date(`${w.start}T00:00:00`);
    const e = new Date(`${w.end}T23:59:59`);
    return today >= s && today <= e;
  };
  const redev = (closures.redevelopment || []).find(inWin);
  if (redev) return { kind: 'redevelopment', end: redev.end };
  const reno = (closures.renovation || []).find(inWin);
  if (reno) return { kind: 'renovation', end: reno.end };
  const clean = (closures.cleaning || []).find(inWin);
  if (clean) return { kind: 'cleaning', end: clean.end };
  return null;
}

// Operator: the map pin's colour matches its card tab's background.
//   cleaning → red · renovation → grey · redevelopment → near-black (light text).
export const CLOSURE_PIN_COLOR = {
  cleaning: '#dc2626',        // red-600
  renovation: '#6b7280',      // gray-500
  redevelopment: '#111827',   // neutral-900 (near-black)
};
export const CLOSURE_TAB_BG = {
  cleaning: 'bg-red-600',
  renovation: 'bg-gray-500',
  redevelopment: 'bg-neutral-900',
};
