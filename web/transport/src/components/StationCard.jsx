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
// Data joins (all read-only):
//   - `station`   rich record from /api/geo/stations (lines[], exits[],
//                 first_last_train[]) — the substance of the card.
//   - `coarse`    the tapped station from /api/transport/stations
//                 (codes[], lines[], lat/lng) — crowd + fallback identity.
//   - `context`   /api/transport/station-context (busStops, taxis, nearestHawker).
//   - `crowd`     /api/transport/crowd  { CODE: 'l'|'m'|'h' }.
//   - `statusByLine`  live per-line service status.
//   - `coarseStations`  the full station list, for terminus resolution.
import React from 'react';
import { t } from '../i18n.js';
import {
  CROWD_DOT, STATUS_HEX, mapsQ, mapsLatLng, textOn, hexForLineCode,
  worstCrowd, trainTimes, noteIsTerminal, directionLabel, terminusForDirection
} from '../lib/station-card-utils.js';

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

// One per-line-code sub-card.
function LineSubCard({ line, station, coarseStations, statusByLine, lang, onFocusStationCode }) {
  const hex = hexForLineCode(line.line_code);
  const st = (statusByLine && statusByLine[line.line_code] && statusByLine[line.line_code].status) || 'normal';
  const statusLabel = t(`mrt.status.${st}`, lang);
  const dirs = (station.first_last_train || []).filter((f) => f.station_code === line.station_code);

  return (
    <div className="rounded-lg border border-tg-border bg-tg-bg/40 p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span style={{ background: hex, color: '#fff' }}
          className="font-bold rounded px-1.5 py-0.5 text-[11px] leading-none">{line.station_code}</span>
        <span className="text-[12px] font-semibold text-tg-text leading-tight flex-1 min-w-0 truncate">{line.line_name}</span>
        <span className="flex items-center gap-1 text-[10px] shrink-0">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: STATUS_HEX[st] || STATUS_HEX.unknown }} />
          <span className="text-tg-hint">{statusLabel}</span>
        </span>
      </div>
      {dirs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {dirs.map((d, i) => (
            <DirectionRow key={i} entry={d} lineCode={line.line_code}
              coarseStations={coarseStations} lang={lang} onFocusStationCode={onFocusStationCode} />
          ))}
        </div>
      )}
      {line.more_info_url && (
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
  onTap = null, active = false, glass = false, compact = false
}) {
  const name = station?.station_name || coarse?.name || '';
  if (!name) return null;

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
  const nearestHawker = context?.nearestHawker || null;

  return (
    <div
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      data-station-card={name}
      onClick={onTap ? () => onTap(coarse || station) : undefined}
      className={`rounded-xl border overflow-hidden text-xs flex flex-col ${onTap ? 'cursor-pointer' : ''} ${active ? 'border-tg-accent ring-1 ring-tg-accent' : 'border-tg-border'} ${glass ? 'bg-tg-card/60 backdrop-blur-md' : 'bg-tg-card'}`}
    >
      {/* Name strip — line colour (single) / white (interchange). */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: stripHex, color: stripText }}>
        <div className="flex flex-wrap items-center gap-1">
          {lines.map((l, i) => (
            <span key={i}
              style={interchange ? { background: hexForLineCode(l.line_code), color: '#fff' } : { background: 'rgba(255,255,255,0.25)', color: stripText }}
              className="font-bold rounded px-1 text-[10px] leading-[1.6]">{l.station_code}</span>
          ))}
        </div>
        <span className="text-[14px] font-bold leading-tight flex-1 min-w-0 truncate">{name}</span>
        {coarse?.future && <span className="text-[10px] opacity-80">({t('mrt.future', lang)})</span>}
        {onClose && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close" className="text-[13px] leading-none opacity-80 active:scale-90" style={{ color: stripText }}>✕</button>
        )}
      </div>

      <div className={`flex flex-col gap-2 ${compact ? 'p-2' : 'p-2.5'}`}>
        {/* Crowd status. */}
        {crowdLevel && (
          <div className="text-[11px] text-tg-text/90">{CROWD_DOT[crowdLevel]} {t(`mrt.crowd.${crowdLevel}`, lang)}</div>
        )}

        {/* Stacked per-line-code sub-cards. */}
        {lines.some((l) => l.line_code) && (
          <div className="flex flex-col gap-1.5">
            {lines.map((l, i) => (
              <LineSubCard key={i} line={l} station={station || {}} coarseStations={coarseStations}
                statusByLine={statusByLine} lang={lang} onFocusStationCode={onFocusStationCode} />
            ))}
          </div>
        )}

        {/* Around the station — underline-free amenity hyperlinks. */}
        {(exits.length > 0 || busStops.length > 0 || taxis.length > 0 || nearestHawker) && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold text-tg-hint">{t('mrt.around', lang)}</div>

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
          </div>
        )}
      </div>
    </div>
  );
}
