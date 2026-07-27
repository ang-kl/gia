// StationCard.jsx — v0.62.598
//
// A Google-Maps-style rich station-info card for the Transport TMA. Operator
// spec (2026-07-18): a card whose name strip is the LINE COLOUR for a single
// line and WHITE for an interchange; then one stacked sub-card per line code
// (station code + line, operating status, first/last train per direction, and
// the terminus code as an in-app hyperlink); then the "around the station"
// amenities — exits, bus stops, taxi stands and the nearest hawker centre — as
// underline-free hyperlinks; plus the live platform crowd status.
//
// v0.62.632 — operator (iPad mini, IMG_1180/1181): the cards were uneven heights
// (the action row "floated above" at different levels) and too sparse per row.
// The card now supports a `collapsible` TILE mode: name strip + a one-line
// status/crowd/distance summary are ALWAYS shown (so every collapsed tile is the
// SAME height), and the heavy body (actions, per-line trains, amenities) folds
// behind a card-level ▾ triangle. Inside, each LINE sub-card owns its OWN ▾ (fold
// its first/last-train detail), and "Around the station" owns another — "multiple
// triangle per card". A selected/active card pops (scale + ring), auto-expands and
// (via the carousel) scrolls to centre, mirroring the Cuisine/iPhone effect.
//
// Data joins (all read-only):
//   - `station`   rich record from /api/geo/stations (lines[], exits[],
//                 first_last_train[]) — the substance of the card.
//   - `coarse`    the tapped station from /api/transport/stations
//                 (codes[], lines[], lat/lng) — crowd + fallback identity.
//   - `context`   /api/transport/station-context (busStops, taxis, nearestHawker).
//   - `crowd`     /api/transport/crowd  { CODE: 'l'|'m'|'h' }.
//   - `statusByLine`  live per-line service status.
//   - `coarseStations`  the full station list, for terminus resolution.
import React, { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { t, tn } from '../i18n.js';
import {
  CROWD_DOT, STATUS_HEX, mapsQ, mapsLatLng, textOn, hexForLineCode,
  worstCrowd, trainTimes, noteIsTerminal, directionLabel, terminusForDirection,
  directionsUrl, shareUrl, todaySummary,
  stationHours, stationOpenNow
} from '../lib/station-card-utils.js';

// v0.62.634 — current minutes-since-midnight in Singapore time, for the
// station's "Open now / Closed now" state. Best-effort (hides on Intl failure).
function sgNowMinutes() {
  try {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const h = Number((p.find((x) => x.type === 'hour') || {}).value);
    const m = Number((p.find((x) => x.type === 'minute') || {}).value);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  } catch { return null; }
}

// v0.62.621 — persist the user's saved (favourite) stations across sessions.
// A plain localStorage set of station names; read/written here so the pure
// utils module stays DOM-free.
const SAVED_KEY = 'gia:tr:saved';
function readSaved() {
  try { const v = JSON.parse(window.localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function writeSaved(list) {
  try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* private mode / quota */ }
}

// v0.62.621 — open a URL via Telegram's in-client opener when available (so
// Directions / Share leave the Mini App cleanly), else a plain new tab.
function openExternal(url, telegram = false) {
  try {
    const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (telegram && w && typeof w.openTelegramLink === 'function') { w.openTelegramLink(url); return; }
    if (w && typeof w.openLink === 'function') { w.openLink(url); return; }
  } catch { /* fall through to window.open */ }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
}

// v0.62.632 — a tiny ▾/▲ disclosure triangle used for every collapse toggle in
// the card (card body, per line, around-the-station). Pure glyph, no text — the
// operator asked for "multiple triangle (collapse/expand) per card".
function Triangle({ open }) {
  return <span className="text-[9px] leading-none select-none" aria-hidden>{open ? '▲' : '▼'}</span>;
}

// v0.62.641 — operator ("what are the share, map, saved/starred buttons so big?"):
// the v0.62.621 action row was a Google-Maps-style 36 px CIRCLE + a caption under
// each — three of those plus labels ate a whole band of card height. The Cuisine
// TMA (the operator's standard) uses flat text pills instead, so this is now the
// same compact pill: one line, icon + word, no circle, no caption.
function ActionButton({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={`text-[11px] px-2 py-0.5 rounded-full border leading-snug active:scale-95 ${active ? 'bg-tg-accent/15 border-tg-accent text-tg-accent' : 'border-tg-border bg-tg-bg text-tg-text'}`}
    >
      {icon} {label}
    </button>
  );
}

// One first_last_train direction row.
function DirectionRow({ entry, lineCode, coarseStations, lang, onFocusStationCode }) {
  const { wdFirst, wdLast, satFirst, sunFirst, weLast, noTimes } = trainTimes(entry.timings || {});
  const term = terminusForDirection(coarseStations, lineCode, entry.direction);
  // Weekend variations shown only when they differ from the weekday time — Sat
  // and Sun/PH are kept separate (a Sun/PH first train often differs from Sat).
  const weekendParts = [];
  if (satFirst && satFirst !== wdFirst) weekendParts.push(`${t('mrt.sat', lang)} ${satFirst}`);
  if (sunFirst && sunFirst !== wdFirst && sunFirst !== satFirst) weekendParts.push(`${t('mrt.sunPh', lang)} ${sunFirst}`);
  if (weLast && weLast !== wdLast) weekendParts.push(`${t('mrt.weekend', lang)} ${t('mrt.lastTrain', lang)} ${weLast}`);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center flex-wrap gap-1 text-[11px]">
        <span className="text-tg-hint">{t('mrt.towards', lang)}</span>
        {term ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFocusStationCode && onFocusStationCode(term.focusCode || (term.codes || [])[0]); }}
            className="inline-flex items-center gap-1 active:scale-95"
          >
            <span style={{ background: hexForLineCode(lineCode), color: '#fff' }}
              className="font-bold rounded px-1 text-[10px] leading-[1.5]">{term.focusCode || (term.codes || [])[0]}</span>
            <span className="text-tg-link font-medium">{term.name}</span>
          </button>
        ) : (
          <span className="text-tg-text/80 font-medium">{directionLabel(entry.direction, t, lang)}</span>
        )}
      </div>
      {noTimes ? (
        // All-null timings: a true terminus (note says so, or none) → "Terminates
        // here"; otherwise a data note ("timings unavailable", "not yet open") →
        // show the note verbatim rather than mislabelling the stop as a terminus.
        <div className="text-[11px] text-tg-hint italic">
          {noteIsTerminal(entry.note) || !entry.note ? t('mrt.terminalHere', lang) : entry.note}
        </div>
      ) : (
        <div className="text-[11px] text-tg-text/80 leading-snug">
          <span className="tabular-nums">🚋 {t('mrt.firstTrain', lang)} {wdFirst || '—'} · {t('mrt.lastTrain', lang)} {wdLast || '—'}</span>
          {weekendParts.length > 0 && (
            <span className="text-tg-hint tabular-nums"> · {weekendParts.join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
}

// One per-line-code sub-card. v0.62.632 — each line now owns its OWN collapse
// triangle (was a single card-level "Train times ▾" driving every line at once).
// Collapsed → the line header + live status + a compact "today" first/last
// summary; the ▾ expands the full per-direction detail. `initialOpen` seeds the
// state (the active card opens its lines).
function LineSubCard({ line, station, coarseStations, statusByLine, lang, onFocusStationCode, initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  useEffect(() => { if (initialOpen) setOpen(true); }, [initialOpen]);
  const hex = hexForLineCode(line.line_code);
  const st = (statusByLine && statusByLine[line.line_code] && statusByLine[line.line_code].status) || 'normal';
  const statusLabel = t(`mrt.status.${st}`, lang);
  const dirs = (station.first_last_train || []).filter((f) => f.station_code === line.station_code);
  const summary = todaySummary(dirs);
  const hasDetail = dirs.length > 0;

  return (
    <div className="rounded-lg border border-tg-border bg-tg-bg/40 p-1.5 flex flex-col gap-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (hasDetail) setOpen((o) => !o); }}
        aria-expanded={hasDetail ? open : undefined}
        className="flex items-center gap-2 text-left"
      >
        <span style={{ background: hex, color: '#fff' }}
          className="font-bold rounded px-1.5 py-0.5 text-[11px] leading-none">{line.station_code}</span>
        <span className="text-[12px] font-semibold text-tg-text leading-tight flex-1 min-w-0 truncate">{line.line_name}</span>
        <span className="flex items-center gap-1 text-[10px] shrink-0">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: STATUS_HEX[st] || STATUS_HEX.unknown }} />
          <span className="text-tg-hint">{statusLabel}</span>
        </span>
        {hasDetail && <span className="shrink-0 text-tg-hint"><Triangle open={open} /></span>}
      </button>
      {hasDetail && (
        open ? (
          <div className="flex flex-col gap-1.5">
            {dirs.map((d, i) => (
              <DirectionRow key={i} entry={d} lineCode={line.line_code}
                coarseStations={coarseStations} lang={lang} onFocusStationCode={onFocusStationCode} />
            ))}
          </div>
        ) : summary && (
          // v0.62.643 — the times row now carries the "Station info ↗" link on its
          // RIGHT instead of giving it a whole row of its own (operator: "so much
          // empty spacing across the card"). Saves one row per line.
          <div className="flex items-center gap-1 text-[11px] text-tg-text/80 tabular-nums leading-snug">
            <span className="truncate">🚋 {summary.first || '—'} · {summary.last || '—'}</span>
            {line.more_info_url && (
              <a href={line.more_info_url} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto shrink-0 text-[10px] text-tg-link no-underline">{t('mrt.stationInfo', lang)}</a>
            )}
          </div>
        )
      )}
      {/* v0.62.633 — the Station info link renders INDEPENDENT of the timings
          fold (Codex P2): a line with a more_info_url but NO first_last_train rows
          (CGL / SLRT / PLRT) has hasDetail=false, so `open` never flips true — the
          link must not be gated on `open` or it would be permanently hidden.
          v0.62.643 — when the COLLAPSED summary row is showing, that row already
          carries the link, so only render the standalone one otherwise. */}
      {line.more_info_url && !(hasDetail && !open && summary) && (
        <a href={line.more_info_url} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="self-start text-[10px] text-tg-link no-underline">{t('mrt.stationInfo', lang)}</a>
      )}
    </div>
  );
}

// A compact underline-free amenity hyperlink chip.
function AmenityLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      className="text-[11px] px-2 py-0.5 rounded-full border border-tg-border bg-tg-bg text-tg-text no-underline active:scale-95">
      {children}
    </a>
  );
}

export default function StationCard({
  station = null, coarse = null, context = null, crowd = null, statusByLine = null,
  coarseStations = null, lang = 'en', onClose = null, onFocusStationCode = null,
  onTap = null, active = false, glass = false, compact = false, collapsible = false, userLoc = null
}) {
  const name = station?.station_name || coarse?.name || '';
  // v0.62.621/632 — hooks must precede the early return (Rules of Hooks).
  // `bodyOpen` drives the card-level collapse (TILE mode): a collapsible card
  // starts closed (uniform tile height) unless it is the active/selected one; a
  // non-collapsible card (phone drawer, single tapped card) is always open.
  // `aroundOpen` folds the "Around the station" amenities.
  // v0.62.645 — operator: "by default show the station details (not collapse)".
  // The card now opens EXPANDED; the foot pill collapses it.
  const [bodyOpen, setBodyOpen] = useState(true);
  const [aroundOpen, setAroundOpen] = useState(false);
  const [saved, setSaved] = useState(() => (name ? readSaved().includes(name) : false));
  // v0.62.636 (C3) — Motion spring drives the selected-card "pop"; disabled for
  // reduced-motion users (the ring/shadow still mark selection).
  const reduceMotion = useReducedMotion();
  // The active card auto-expands (the carousel/grid "selected" pop effect).
  useEffect(() => { if (active) setBodyOpen(true); }, [active]);
  if (!name) return null;

  // Station coordinates (for Directions / Share / distance): prefer the tapped
  // coarse record, else the rich record.
  const lat = Number(coarse?.lat ?? station?.lat);
  const lng = Number(coarse?.lng ?? station?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  // v0.62.641 — the distance / walking-time derivation is GONE (operator: "remove
  // distance walking in train"). haversineM / walkMinutes stay exported + unit
  // tested in station-card-utils for other callers.

  const toggleSaved = () => {
    const list = readSaved();
    const next = list.includes(name) ? list.filter((n) => n !== name) : [...list, name];
    writeSaved(next);
    setSaved(next.includes(name));
  };

  // Rich line list (preferred) else synthesise from the coarse codes.
  const lines = (station?.lines && station.lines.length)
    ? station.lines
    : (coarse?.codes || []).map((code) => ({
        station_code: code, line_code: '', line_name: '', more_info_url: ''
      }));
  const interchange = lines.length > 1;

  // Name strip: single line → its colour; interchange → white.
  const stripHex = interchange ? '#ffffff' : hexForLineCode(lines[0]?.line_code);
  const stripText = interchange ? '#111827' : textOn(stripHex);

  const codes = coarse?.codes || lines.map((l) => l.station_code);
  const crowdLevel = worstCrowd(crowd, codes);

  // Exits: prefer the rich records (label + coords, always present); each is a
  // maps link. Bus stops: context feed, else derive from the exits' own
  // nearest_bus_stop. Taxis + nearest hawker: context feed.
  const exits = station?.exits || [];
  const ctxBus = (context?.busStops || []);
  const derivedBus = exits
    .map((e) => e.nearest_bus_stop).filter(Boolean);
  const busStops = ctxBus.length ? ctxBus : derivedBus;
  const taxis = context?.taxis || [];
  // v0.62.634 — operator: "Where are the … car park details" — the station-context
  // feed already carries nearby carparks (≤400 m); render them in the amenities.
  const carparks = context?.carparks || [];
  const nearestHawker = context?.nearestHawker || null;

  // v0.62.634 — operator: the card should say "is it open" + the operating
  // (first/last train) hours. Derived from the rich first_last_train data.
  const hours = stationHours(lines, station);
  const openNow = coarse?.future ? null : stationOpenNow(hours, sgNowMinutes());

  // v0.62.632 — the always-visible one-line summary under the name strip (so the
  // collapsed tile is uniform height AND informative): a live status dot per line
  // + crowd dot + distance. Kept to a single truncating row.
  const worstStatus = lines.reduce((acc, l) => {
    const s = (statusByLine && statusByLine[l.line_code] && statusByLine[l.line_code].status) || 'normal';
    return s !== 'normal' ? s : acc;
  }, 'normal');

  return (
    <div className="w-full flex flex-col">
    {/* v0.62.646 — operator: "station that is future have a tab like cuisine TMA
        card with the word 'future'". Same folder-tab construction as Cuisine's
        "Closed" tab (ResultCard.jsx): rendered OUTSIDE the bordered card so the
        card's rounded corner can never slice through it, `-mb-1` tucking its flat
        bottom under the card's top edge, `ml-3` offsetting it from the corner.
        CVD-safe — the WORD carries the meaning, the colour only reinforces it. */}
    {coarse?.future && (
      <div className="ml-3 -mb-1 self-start relative z-10 px-3 py-0.5 rounded-t-lg bg-slate-600 text-white text-[10px] font-bold leading-snug uppercase tracking-wide">
        {t('mrt.future', lang)}
      </div>
    )}
    <m.div
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      data-station-card={name}
      onClick={onTap ? () => onTap(coarse || station) : undefined}
      animate={reduceMotion ? undefined : { scale: active ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
      /* v0.62.646 — operator's own A/B verdict (IMG_1216 Train vs IMG_1217 Cuisine):
         the FIXED collapsed height was the mistake. Cuisine's cards are NOT uniform
         — each is sized by its content, which is exactly why they read better and
         carry no dead space. So the fixed height is GONE: the Train card is now
         content-sized in both states, like Cuisine and Hawker. */
      className={`rounded-xl border overflow-hidden text-xs flex flex-col ${onTap ? 'cursor-pointer' : ''} ${active ? 'border-tg-accent ring-2 ring-tg-accent shadow-xl relative z-10' : 'border-tg-border'} ${glass ? 'bg-tg-card/60 liquid-glass' : 'bg-tg-card'}`}
    >
      {/* Name strip — line colour (single) / white (interchange).
          v0.62.641 — operator ("train card when tap isn't zoom in"): the strip used
          to be the collapse toggle and swallowed the tap (stopPropagation), so
          tapping a card never reached onTap → the map never focused/zoomed the
          station. The strip no longer toggles; the tap bubbles to the card's onTap
          (select → map setCenter+zoom 18). ONLY the ▾ button collapses. */}
      <div
        className="px-2 py-1.5 flex items-center gap-1.5"
        style={{ background: stripHex, color: stripText }}
      >
        <div className="flex flex-wrap items-center gap-1">
          {lines.map((l, i) => (
            <span key={i}
              style={interchange ? { background: hexForLineCode(l.line_code), color: '#fff' } : { background: 'rgba(255,255,255,0.25)', color: stripText }}
              className="font-bold rounded px-1 text-[10px] leading-[1.6]">{l.station_code}</span>
          ))}
        </div>
        {/* v0.62.643 — operator ("can you resolve the station name … by 2 px" +
            "when all collapse what can I read"): the NAME is the one thing a
            collapsed card must show, and it was truncating to "Ju…" / "Bukit Bat…"
            because the category chip ("MRT station" / "Interchange") sat beside it
            and ate the width. The chip is REMOVED — it was redundant, since two
            line-code chips already say "interchange" — and the name is +2 px
            (14 → 16) with the full remaining width. `truncate` stays as a last
            resort for the longest names on the narrowest card. */}
        {/* v0.62.645 — operator: "reduce the station name font size by 2 px and
            standardised to use Google interface font". 16 → 14 px, and `font-google`
            (styles.css) puts it on Roboto — the Google Maps interface face, which
            the Maps JS API already loads into the page — so the card's title reads
            as the same family as the map labels beside it. */}
        <span className="font-google text-[14px] font-bold leading-tight flex-1 min-w-0 truncate">{name}</span>
        {/* v0.62.646 — the inline "(future)" marker is retired: the folder TAB
            above the card now carries it (Cuisine parity). */}
        {/* v0.62.644 — the card-level disclosure moved OFF the name strip to a
            Cuisine-style pill at the CARD FOOT (operator: "the collapse and expand
            is same effect as cuisine TMA"), so the strip is name-only and the name
            keeps every pixel of width. */}
        {onClose && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close" className="text-[13px] leading-none opacity-80 active:scale-90" style={{ color: stripText }}>✕</button>
        )}
      </div>

      {/* v0.62.640 — operator ("why you don't follow the height in hawker"): the
          ALWAYS-VISIBLE summary is the collapsed card's whole body, so it must read
          like a Hawker centre card — a couple of tight lines, not a wall. Two
          compact rows: (1) health + open-now + crowd, (2) operating hours + walk.
          Each row `truncate`s rather than wrapping, so a NARROW carousel card can
          never grow tall by re-flowing (the v0.62.639 height regression). */}
      {/* v0.62.643 — operator ("so much empty spacing across the card, reduce to
          show more information"): the summary was TWO rows, each half-empty — the
          status line stopped mid-card and the hours sat alone on the next line.
          Now ONE row that actually uses the width: health · Open-now · crowd ·
          hours. (The 🚶 walk stays removed, v0.62.641.) */}
      {collapsible && (
        <div className="px-2 py-1 flex items-center gap-1 text-[10px] leading-tight text-tg-text/80 border-b border-tg-border/60">
          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_HEX[worstStatus] || STATUS_HEX.unknown }} />
          <span className="text-tg-hint truncate">{t(`mrt.status.${worstStatus}`, lang)}</span>
          {openNow != null && (
            <span className={`shrink-0 font-semibold ${openNow ? 'text-green-500' : 'text-orange-500'}`}>
              · {openNow ? t('mrt.openNow', lang) : t('mrt.closedNow', lang)}
            </span>
          )}
          {crowdLevel && <span className="shrink-0" title={t(`mrt.crowd.${crowdLevel}`, lang)}>{CROWD_DOT[crowdLevel]}</span>}
          {hours && (hours.first || hours.last) && (
            <span className="ml-auto shrink-0 text-tg-hint tabular-nums">🕑 {hours.first || '—'}–{hours.last || '—'}</span>
          )}
        </div>
      )}

      {/* v0.62.644 — operator: a COLLAPSED card must carry a Cuisine-like amount of
          information, not two lines in an otherwise empty box. While collapsed the
          card also shows one compact line PER LINE (code + first/last) and a single
          amenity-counts row; the ▾ pill below then reveals the full detail. */}
      {collapsible && !bodyOpen && (
        <div className="px-2 py-1 flex flex-col gap-0.5 text-[10px] leading-tight">
          {lines.filter((l) => l.line_code).map((l, i) => {
            const dirs = ((station && station.first_last_train) || []).filter((f) => f.station_code === l.station_code);
            const s = todaySummary(dirs);
            return (
              <div key={i} className="flex items-center gap-1 min-w-0">
                <span style={{ background: hexForLineCode(l.line_code), color: '#fff' }}
                  className="font-bold rounded px-1 text-[9px] leading-[1.5] shrink-0">{l.station_code}</span>
                <span className="text-tg-text/80 tabular-nums truncate">
                  {s ? `🚋 ${s.first || '—'} · ${s.last || '—'}` : (l.line_name || '')}
                </span>
              </div>
            );
          })}
          {(exits.length > 0 || busStops.length > 0 || carparks.length > 0 || nearestHawker) && (
            <div className="flex items-center gap-1.5 text-tg-hint truncate">
              {exits.length > 0 && <span className="shrink-0">🚪 {exits.length}</span>}
              {busStops.length > 0 && <span className="shrink-0">🚌 {busStops.length}</span>}
              {carparks.length > 0 && <span className="shrink-0">🅿️ {carparks.length}</span>}
              {nearestHawker && (
                <span className="truncate">🍜 {Number.isFinite(nearestHawker.distanceM) ? `${nearestHawker.distanceM} m` : nearestHawker.name}</span>
              )}
            </div>
          )}
        </div>
      )}

      {(!collapsible || bodyOpen) && (
      // v0.62.639 — operator: "reduce spacing above and below the body text". Tight
      // gaps + padding in compact (carousel / grid) so a card reads at Hawker height.
      <div className={`flex flex-col ${compact ? 'gap-1 p-1.5' : 'gap-2 p-2.5'}`}>
        {/* v0.62.634 — operator card order: (1) current status / is-it-open /
            health, (2) operating hours, (3) exits · bus stops · carparks · hawker,
            (4) per-line status sub-cards, (5) Directions/Save/Share LAST (operator:
            "why the share … at the top" — moved off the top). */}

        {/* (1)+(2) Health + Open-now + operating hours. Health (service status)
            is CVD-safe: a dot paired with the word.
            v0.62.641 — operator ("use cuisine TMA's card height as a standard"):
            in COLLAPSIBLE mode the always-visible summary above ALREADY carries
            status / open-now / crowd / hours, so repeating them here doubled the
            card's height for zero information (visible in IMG_1206). Render this
            block only for the non-collapsible card (phone drawer / single tapped
            card), where there is no summary row above. */}
        {!collapsible && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: STATUS_HEX[worstStatus] || STATUS_HEX.unknown }} />
              <span className="text-tg-text/90 font-medium">{t(`mrt.status.${worstStatus}`, lang)}</span>
            </span>
            {openNow != null && (
              <span className={`font-semibold ${openNow ? 'text-green-500' : 'text-orange-500'}`}>
                · {openNow ? t('mrt.openNow', lang) : t('mrt.closedNow', lang)}
              </span>
            )}
            {crowdLevel && <span className="text-tg-text/80">· {CROWD_DOT[crowdLevel]} {t(`mrt.crowd.${crowdLevel}`, lang)}</span>}
          </div>
          {hours && (hours.first || hours.last) && (
            <div className="text-[11px] text-tg-hint tabular-nums">
              🕑 {t('mrt.hours', lang)}: {hours.first || '—'} – {hours.last || '—'}
            </div>
          )}
        </div>
        )}

        {/* (3) Around the station — v0.62.632 folds behind its own ▾ triangle;
            v0.62.634 adds carpark details. */}
        {(exits.length > 0 || busStops.length > 0 || carparks.length > 0 || taxis.length > 0 || nearestHawker) && (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAroundOpen((o) => !o); }}
              aria-expanded={aroundOpen}
              className="self-start flex items-center gap-1 text-[11px] font-semibold text-tg-hint active:scale-95"
            >{t('mrt.around', lang)} <Triangle open={aroundOpen} /></button>

            {aroundOpen && (<>
            {exits.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-tg-hint mr-0.5">{t('mrt.exits', lang)}</span>
                {exits.map((e, i) => (
                  <AmenityLink key={i} href={mapsLatLng(e.lat, e.lng)}>🚪 {e.label}</AmenityLink>
                ))}
              </div>
            )}

            {busStops.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-tg-hint mr-0.5">{t('mrt.busStops', lang)}</span>
                {busStops.slice(0, 6).map((b, i) => {
                  const desc = b.description || b.roadName || '';
                  return (
                    <AmenityLink key={i} href={mapsQ(['Bus Stop', b.code, desc, 'Singapore'].filter(Boolean).join(' '))}>
                      🚌 {b.code}{desc ? ` · ${desc}` : ''}
                    </AmenityLink>
                  );
                })}
              </div>
            )}

            {/* v0.62.634 — carpark details (from station-context, ≤400 m). */}
            {carparks.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-tg-hint mr-0.5">{t('mrt.carparks', lang)}</span>
                {carparks.slice(0, 6).map((cp, i) => (
                  <AmenityLink key={i} href={mapsLatLng(cp.lat, cp.lng)}>
                    🅿️ {cp.name}{Number.isFinite(cp.distanceM) ? ` · ${cp.distanceM} m` : ''}
                  </AmenityLink>
                ))}
              </div>
            )}

            {taxis.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-tg-hint mr-0.5">{t('mrt.taxi', lang)}</span>
                {taxis.slice(0, 4).map((tx, i) => {
                  const label = tx.kind === 'pickup' ? t('mrt.taxiPickup', lang) : t('mrt.taxiStand', lang);
                  return (
                    <AmenityLink key={i} href={mapsLatLng(tx.lat, tx.lng)}>🚕 {label}</AmenityLink>
                  );
                })}
              </div>
            )}

            {nearestHawker && (
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] text-tg-hint mr-0.5">{t('mrt.nearestHawker', lang)}</span>
                <AmenityLink href={mapsQ(`${nearestHawker.name} Singapore`)}>
                  🍜 {nearestHawker.name}{Number.isFinite(nearestHawker.distanceM) ? ` · ${nearestHawker.distanceM} m` : ''}
                </AmenityLink>
              </div>
            )}
            </>)}
          </div>
        )}

        {/* (4) Per-line-code status sub-cards. v0.62.632 — each line owns its OWN
            ▾ (fold its first/last-train detail); the active card opens them. */}
        {lines.some((l) => l.line_code) && (
          <div className="flex flex-col gap-1.5">
            {lines.map((l, i) => (
              <LineSubCard key={i} line={l} station={station || {}} coarseStations={coarseStations}
                statusByLine={statusByLine} lang={lang} onFocusStationCode={onFocusStationCode}
                initialOpen={active} />
            ))}
          </div>
        )}

        {/* (5) Google-Maps action row, LAST (operator: not at the top): Directions ·
            Save · Share. Directions falls back to a name search when coords are absent. */}
        <div className="flex items-center gap-1 flex-wrap border-t border-tg-border/60 pt-1 mt-0.5">
          {/* v0.62.645 — "📍 Maps" (Cuisine/Hawker wording + glyph), opening the
              STATION on Google Maps like their cards do, instead of "🧭 Directions"
              opening the routing UI. */}
          <ActionButton icon="📍" label={t('mrt.act.maps', lang)}
            onClick={() => openExternal(hasCoords ? mapsLatLng(lat, lng) : mapsQ(`${name} MRT Station Singapore`))} />
          <ActionButton icon={saved ? '★' : '☆'} active={saved}
            label={saved ? t('mrt.act.saved', lang) : t('mrt.act.save', lang)} onClick={toggleSaved} />
          <ActionButton icon="⤴" label={t('mrt.act.share', lang)}
            onClick={() => openExternal(shareUrl(lat, lng, name), true)} />
        </div>
      </div>
      )}

      {/* v0.62.644 — the Cuisine-style collapse pill at the card FOOT ("▾ details" /
          "▴ less"), replacing the triangle that used to sit on the name strip.
          `mt-auto` pins it to the bottom so every card in the carousel shows its
          toggle on the same line — the uniform look of the Cuisine strip. */}
      {collapsible && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setBodyOpen((o) => !o); }}
          aria-expanded={bodyOpen}
          className="mt-auto self-start m-1.5 px-2 py-0.5 rounded-full border border-tg-accent/50 text-[10px] text-tg-accent font-medium active:scale-95"
        >{bodyOpen ? t('mrt.detailsLess', lang) : t('mrt.detailsMore', lang)}</button>
      )}
    </m.div>
    </div>
  );
}
