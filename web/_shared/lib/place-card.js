// place-card.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Parts A and C.
//
// Operator, 23-11 '26: "since now I can click on the bus stop and you give details, how about - other eateries on the
// map, hospital, hotel, shopping, police station, park, attractions, building name, etc."
//
// The card a tap on a Google map icon opens, shared verbatim by the Cuisine, Hawker and Train maps. It lives in the
// same bubble as the station and bus-stop cards, so it is an HTML string like theirs and the eatery cards fold while
// it is open. Two halves:
//   - pure builders (placeInner, actionsRow, loadingInner, refusalInner, the two links), which take a server answer
//     and return markup with every value escaped;
//   - createPlaceTap, which shows "looking up", asks our own server once, and fills the card - or says plainly why
//     it could not, with a way out. It is never left blank or stuck.
// The server (place-card.js at the repo root) decides what the place is and what it costs; nothing here calls Google.
//
// The card uses inline styles only. A class would need each app's Tailwind to have seen this folder, and a re-export
// carries code, not styles (the airports board taught that in v0.62.989).

import { pct } from './place-card-i18n.js';

export function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '');
const fin = (v) => typeof v === 'number' && Number.isFinite(v);

const RAD = Math.PI / 180;
function distM(a, b) {
  const x = Math.sin((b.lat - a.lat) * RAD / 2) ** 2
    + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin((b.lng - a.lng) * RAD / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

// Metres below a kilometre, kilometres with one decimal above. Empty for anything that is not a distance.
export function formatDistance(m) {
  if (!fin(m) || m < 0) return '';
  const r = Math.round(m);
  return r < 1000 ? `${r} m` : `${(m / 1000).toFixed(1)} km`;
}

// Google's own Maps URL form: the position, and the place ID when there is one.
export function mapsLink(p) {
  if (!p || !fin(p.lat) || !fin(p.lng)) return '';
  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lng}`)}`;
  return typeof p.placeId === 'string' && p.placeId ? `${base}&query_place_id=${encodeURIComponent(p.placeId)}` : base;
}

// The Cuisine app at a place, in the hash Cuisine already reads on start (state.js readOverridesFromHash: lat, lng,
// and a name of at most 80 characters).
export function cuisineLink(p) {
  if (!p || !fin(p.lat) || !fin(p.lng)) return '';
  const q = new URLSearchParams();
  q.set('lat', p.lat.toFixed(6));
  q.set('lng', p.lng.toFixed(6));
  const name = String(p.name || '').slice(0, 80);
  if (name) q.set('place', name);
  return `/app/cuisine/#${q.toString()}`;
}

// The reader's own result with this Google place ID, or null. A match is selected instead of looked up.
export function resultMatch(venues, placeId) {
  if (!Array.isArray(venues) || typeof placeId !== 'string' || !placeId) return null;
  return venues.find((v) => v && v.placeId === placeId) || null;
}

const FAMILY_GLYPH = {
  eatery: '🍴', bar: '🍸', lodging: '🏨', shopping: '🛍️', health: '🏥', safety: '👮', nature: '🌳', sight: '⚝',
  transit: '🚉', worship: '🛐', learning: '🎓', building: '🏢',
};
// "Eateries here" for a place one eats INSIDE (a mall, a hotel, a building); "near here" for everything else.
const HERE_FAMILIES = new Set(['shopping', 'lodging', 'building']);
const SUB = '#6b6b70';
const LINK = '#2481cc';

// The buttons. Cuisine: search around the place, or set it as the location without searching. Hawker and Train have
// no location of their own to set, so they offer only "Eateries near here", which opens Cuisine at the place.
export function actionsRow(body, opts = {}) {
  const lang = opts.lang || 'en';
  const app = opts.app || 'transport';
  const family = (body && body.family) || 'building';
  const button = (action, label, primary) => `<button type="button" data-place-action="${action}" `
    + `onclick="window.__giaPlaceAction&&window.__giaPlaceAction('${action}')" `
    + 'style="display:block;width:100%;min-height:44px;padding:0 10px;border-radius:9999px;font:inherit;font-size:13px;cursor:pointer;'
    + (primary ? `font-weight:700;border:none;background:${LINK};color:#fff;` : 'font-weight:600;border:1px solid rgba(128,128,128,0.55);background:transparent;color:inherit;')
    + `">${esc(label)}</button>`;
  const nearKey = app === 'cuisine' && HERE_FAMILIES.has(family) ? 'eateriesHere' : 'eateriesNear';
  let h = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">';
  h += button('near', pct(nearKey, lang), true);
  if (app === 'cuisine') h += button('set', pct('setLocation', lang), false);
  return `${h}</div>`;
}

// Google's card, as the inside of a map bubble. Every value from the server is escaped; a line the server had nothing
// for is left out; the closing-time guess shows only when there is no real open or closed line.
export function placeInner(body, opts = {}) {
  const lang = opts.lang || 'en';
  const app = opts.app || 'transport';
  const sub = opts.sub || SUB;
  const link = opts.link || LINK;
  const p = (body && body.place) || {};
  const family = (body && body.family) || 'building';
  const glyph = FAMILY_GLYPH[family] || FAMILY_GLYPH.building;
  const line = (html) => `<div style="color:${sub};margin-top:2px;">${html}</div>`;
  let h = '';
  if (p.typeLabel) h += `<div style="font-size:11px;font-weight:600;color:${sub};">${glyph} ${esc(p.typeLabel)}</div>`;
  h += `<div style="font-weight:600;font-size:13px;">${p.typeLabel ? '' : `${glyph} `}${esc(p.name || '')}</div>`;
  const bits = [];
  if (fin(p.rating)) bits.push(`★${p.rating.toFixed(1)}${fin(p.ratingCount) ? ` (${Math.round(p.ratingCount).toLocaleString('en-US')})` : ''}`);
  if (Number.isInteger(p.priceLevel) && p.priceLevel >= 1 && p.priceLevel <= 4) bits.push('$'.repeat(p.priceLevel));
  if (bits.length) h += `<div style="margin-top:2px;">${bits.join(' · ')}</div>`;
  if (p.openLabel) h += line(`🕛 ${esc(p.openLabel)}`);
  else if (p.closedGuess === true) h += line(`🕛 ${esc(pct('probablyClosed', lang))}`);
  if (app === 'cuisine' && fin(opts.distanceM) && opts.distanceM >= 0) h += line(`📏 ${esc(pct('distance', lang, { d: formatDistance(opts.distanceM) }))}`);
  if (p.address) h += line(`📇 ${esc(p.address)}`);
  h += actionsRow(body, { lang, app });
  const maps = safeUrl(p.mapsUri);
  h += `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;font-size:11px;color:${sub};">`
    + `<span>${esc(pct('fromGoogle', lang))}</span>`
    + (maps ? `<a href="${esc(maps)}" target="_blank" rel="noopener" style="color:${link};font-weight:600;text-decoration:underline;">${esc(pct('openMaps', lang))}</a>` : '')
    + '</div>';
  return h;
}

// One of our own records this map has no card for: its name, and the buttons.
function ownPlainInner(body, opts) {
  const family = (body && body.family) || 'building';
  const name = (body && body.place && body.place.name) || (body && body.own && body.own.name) || '';
  return `<div style="font-weight:600;font-size:13px;">${FAMILY_GLYPH[family] || FAMILY_GLYPH.building} ${esc(name)}</div>${actionsRow(body, opts)}`;
}

export function loadingInner(lang) {
  return `<div style="font-weight:600;">⏳ ${esc(pct('loading', lang))}</div>`;
}

// Why there is no card, and a way out. Any reason other than the two limits reads as "could not load".
export function refusalInner(reason, opts = {}) {
  const lang = opts.lang || 'en';
  const key = reason === 'cap' ? 'capReached' : reason === 'budget' ? 'budgetReached' : 'unavailable';
  const at = opts.at || {};
  const url = mapsLink({ placeId: opts.placeId, lat: at.lat, lng: at.lng });
  return `<div style="font-weight:600;">${esc(pct(key, lang))}</div>`
    + (url ? `<div style="margin-top:4px;"><a href="${esc(url)}" target="_blank" rel="noopener" style="color:${opts.link || LINK};font-weight:600;text-decoration:underline;">${esc(pct('openMaps', lang))}</a></div>` : '');
}

// Put the buttons inside a card one of the map's own builders made, before its closing tag.
export function withActions(cardHtml, row) {
  if (!row) return cardHtml || '';
  if (!cardHtml) return row;
  const i = cardHtml.lastIndexOf('</div>');
  return i < 0 ? cardHtml + row : cardHtml.slice(0, i) + row + cardHtml.slice(i);
}

// The ring drawn on the tapped icon while its card is open. It takes no taps, so the icon under it stays tappable.
export function pinNode(doc) {
  const el = doc.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    width: '34px', height: '34px', borderRadius: '50%', boxSizing: 'border-box', pointerEvents: 'none',
    border: `3px solid ${LINK}`, background: 'rgba(36,129,204,0.16)', transform: 'translateY(50%)',
  });
  return el;
}

// The tap itself. `deps` is everything the host map owns:
//   app, getLang, isDestroyed, fetchJson(url), getOrigin() (Cuisine: the set location), onAction(kind, place),
//   palette() → { sub, link }, card(inner) → bubble markup, show(html, at), update(html), dismiss(),
//   own: { hospital, police, attraction, hawker } → bubble markup for one of our records,
//   openOwn(kind, record) → true when the host opened its own view for it, refine: { kind: (record) => Promise<html> },
//   canFocusStation() and focusStation(code) (the opener answers false only when it knows it cannot open that code),
//   stillOpen() → the bubble is still open on the ring this tap drew, lost() → remove that ring and nothing else,
//   and win (the window; a stand-in under test).
// open(tap) answers at once whether a card is now open; `last` is the fill still under way.
export function createPlaceTap(deps) {
  const d = deps || {};
  const app = d.app || 'transport';
  const win = d.win || (typeof window !== 'undefined' ? window : {});
  let seq = 0;
  let current = null;   // the place whose card is filled; the buttons act on this and on nothing else
  const lang = () => (typeof d.getLang === 'function' && d.getLang()) || 'en';
  const gone = () => typeof d.isDestroyed === 'function' && d.isDestroyed() === true;
  const palette = () => (typeof d.palette === 'function' && d.palette()) || {};
  // The bubble is shared with every other map card. An answer that arrives after the reader has opened something else
  // in it (a stop, a layer pin) or closed it must not be drawn there (review finding on #1936). The host says whether
  // the bubble is still open on the ring this tap drew; a host that cannot say is taken at its word, as before.
  const ours = () => typeof d.stillOpen !== 'function' || d.stillOpen() === true;
  const lose = () => { current = null; if (typeof d.lost === 'function') d.lost(); return undefined; };

  function act(kind) {
    if (kind !== 'near' && kind !== 'set') return;
    if (kind === 'set' && app !== 'cuisine') return;
    if (!current || typeof d.onAction !== 'function') return;
    d.onAction(kind, { ...current });
  }
  function refusal(reason, tap) {
    current = null;
    d.update(d.card(refusalInner(reason, { lang: lang(), placeId: tap.placeId, at: tap.at, ...palette() })));
  }
  function fill(body, tap, mine) {
    if (!body || body.ok !== true || !body.place) return refusal(body && body.reason, tap);
    const place = {
      placeId: tap.placeId, name: String(body.place.name || ''),
      lat: fin(body.place.lat) ? body.place.lat : tap.at.lat, lng: fin(body.place.lng) ? body.place.lng : tap.at.lng,
    };
    const o = { lang: lang(), app };
    if (body.source === 'own' && body.own) {
      // A station opens our station view; a kind the host shows itself (a hawker centre on the Hawker map) opens that.
      if (body.kind === 'station' && body.own.code && typeof d.focusStation === 'function'
        && (typeof d.canFocusStation !== 'function' || d.canFocusStation() === true)) {
        // The lookup card goes first, because the station view may open in this same bubble.
        d.dismiss();
        if (d.focusStation(body.own.code) !== false) return undefined;
        // The map could not open that station after all: put a card back on the icon and show the station by name.
        d.show(d.card(ownPlainInner(body, o)), { lat: tap.at.lat, lng: tap.at.lng });
        current = place;
        return undefined;
      }
      if (typeof d.openOwn === 'function' && d.openOwn(body.kind, body.own) === true) { d.dismiss(); return undefined; }
      const row = actionsRow(body, o);
      const draw = d.own && d.own[body.kind];
      d.update(typeof draw === 'function' ? withActions(draw(body.own), row) : d.card(ownPlainInner(body, o)));
      current = place;
      const better = typeof draw === 'function' && d.refine && d.refine[body.kind];
      if (typeof better !== 'function') return undefined;
      return Promise.resolve().then(() => better(body.own))
        .then((html) => {
          if (mine !== seq || gone()) return;
          if (!ours()) { lose(); return; }
          if (html) d.update(withActions(html, row));
        })
        .catch(() => { /* the card already shown stays */ });
    }
    if (body.source !== 'google') return refusal('unavailable', tap);
    const origin = app === 'cuisine' && typeof d.getOrigin === 'function' ? d.getOrigin() : null;
    const distanceM = origin && fin(origin.lat) && fin(origin.lng) ? distM(origin, place) : null;
    d.update(d.card(placeInner(body, { ...o, ...(distanceM == null ? {} : { distanceM }), ...palette() })));
    current = place;
    return undefined;
  }

  const api = {
    last: Promise.resolve(),
    open(tap) {
      if (gone() || !tap || typeof tap.placeId !== 'string' || !tap.placeId || !tap.at || !fin(tap.at.lat) || !fin(tap.at.lng)) return false;
      const mine = ++seq;
      current = null;
      win.__giaPlaceAction = act;
      d.show(d.card(loadingInner(lang())), { lat: tap.at.lat, lng: tap.at.lng });
      const url = `/api/place-card?id=${encodeURIComponent(tap.placeId)}&lang=${encodeURIComponent(lang())}`;
      let pending;
      try { pending = Promise.resolve(d.fetchJson(url)); } catch (err) { pending = Promise.reject(err); }
      api.last = pending
        .then((body) => {
          if (mine !== seq || gone()) return undefined;
          return ours() ? fill(body, tap, mine) : lose();
        })
        .catch(() => {
          if (mine !== seq || gone()) return;
          if (ours()) refusal('unavailable', tap); else lose();
        });
      return true;
    },
  };
  return api;
}
