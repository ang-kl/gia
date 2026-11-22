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
  // v0.62.914 — `partial` rides along when NEA's remark says only part of the centre shuts. It is
  // carried rather than folded into `kind` on purpose: a partial CLEANING and a partial RENOVATION
  // are still different works, and collapsing them would lose which one is happening.
  const redev = (closures.redevelopment || []).find(inWin);
  if (redev) return { kind: 'redevelopment', end: redev.end, partial: redev.partial || null };
  const reno = (closures.renovation || []).find(inWin);
  if (reno) return { kind: 'renovation', end: reno.end, partial: reno.partial || null };
  const clean = (closures.cleaning || []).find(inWin);
  if (clean) return { kind: 'cleaning', end: clean.end, partial: clean.partial || null };
  return null;
}

// v0.62.912 — THE SOONEST WINDOW STILL AHEAD, which is the question the card could not answer.
//
// `activeClosure` above returns something only while TODAY is inside a window, and measured against
// the shipped data that is 4 centres out of 123. The other 119 cards said nothing about closures at
// all — not because the information was missing, but because nothing asked for it: the API has been
// forwarding every future window the whole time (204 of them; 122 of 123 centres have a next
// closure). A user planning Sunday lunch could not see that the centre shuts on Sunday.
//
// Same precedence as `activeClosure` — redevelopment > renovation > cleaning — applied only to
// break ties on an identical start date. Otherwise the SOONEST wins regardless of kind, because
// "what closes first" is the question, and a cleaning day next week matters more to a diner than
// a renovation the month after.
//
// Returns `{ kind, start, end }`; note the extra `start`, which `activeClosure` has no use for.
export function nextClosure(closures) {
  if (!closures) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const RANK = { redevelopment: 0, renovation: 1, cleaning: 2 };
  let best = null;
  for (const kind of ['redevelopment', 'renovation', 'cleaning']) {
    for (const w of (closures[kind] || [])) {
      if (!w || !w.start || !w.end) continue;
      const s = new Date(`${w.start}T00:00:00`);
      if (!(s > today)) continue;                    // today-or-past is activeClosure's business
      if (!best || s < best.date || (s.getTime() === best.date.getTime() && RANK[kind] < RANK[best.kind])) {
        best = { kind, start: w.start, end: w.end, partial: w.partial || null, date: s };
      }
    }
  }
  return best ? { kind: best.kind, start: best.start, end: best.end, partial: best.partial } : null;
}

// The date a closure STARTS, formatted like closureTill formats an end: "7th" inside this month,
// "8 December" later this year, "1 March 2027" beyond it. Same helper, different field — kept as a
// thin alias rather than a copy so the two can never format differently.
export const closureFrom = closureTill;

/**
 * The colour key for a closure — `partial` when NEA says part of the centre stays open, otherwise
 * the works kind. ONE function so the card tab and the map pin cannot disagree, which is the whole
 * reason this file exists.
 */
export function closureKey(closure) {
  if (!closure) return null;
  return closure.partial ? 'partial' : closure.kind;
}

// Operator: the map pin's colour matches its card tab's background.
//   cleaning → red · renovation → grey · redevelopment → near-black (light text).
export const CLOSURE_PIN_COLOR = {
  cleaning: '#dc2626',        // red-600
  renovation: '#6b7280',      // gray-500
  redevelopment: '#111827',   // neutral-900 (near-black)
  // v0.62.914 — PARTLY OPEN outranks the kind for colour, because the thing a reader needs at a
  // glance is "can I eat here", not "which works are on". Amber is the repo's existing
  // something-to-note colour (TEMP_PIN_COLOR in _shared/lib/temp-pin.js).
  partial: '#f59e0b',         // amber-500
};
export const CLOSURE_TAB_BG = {
  cleaning: 'bg-red-600',
  renovation: 'bg-gray-500',
  redevelopment: 'bg-neutral-900',
  partial: 'bg-amber-500',
};
