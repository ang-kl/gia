import React, { useEffect, useState } from 'react';
import LineBadge from './LineBadge.jsx';
import { lineStationsFull, parseCode, PREFIX_TO_LINE } from '../data/line-paths.js';
import { LINES_BY_CODE } from '../data/lines.js';
import { lineName } from '../../../_shared/lib/mrt-lines-i18n.generated.js';
import { secondLine } from '../../../_shared/lib/name-second-line.js';
import { usePronunciations } from '../../../_shared/lib/use-pronounce.js';
import PronounceIcon from '../../../_shared/components/PronounceIcon.jsx';
import { initData } from '../tg.js';
import { t, tn } from '../i18n.js';

// Hitachi-style left panel — line code badge + name (English),
// direction, status icon (▲ delay / ⛔ closure / ✕ disrupted),
// cause line. Mirrors the Yokohama Line reference card.
const STATUS_ICON = {
  delay:      '⚠️',
  disrupted:  '⛔',
  closure:    '🚧',
  normal:     '✓',
  unknown:    '·'
};

const STATUS_LABEL = {
  delay:      'Delay',
  disrupted:  'Service disrupted',
  closure:    'Closure',
  normal:     'Normal service',
  unknown:    'Status unknown'
};

const STATUS_COLOR = {
  delay:      '#FF9500',
  disrupted:  '#FF3B30',
  closure:    '#FF3B30',
  normal:     '#34C759',
  unknown:    '#8E8E93'
};

const CROWD_DOT = { l: '🟢', m: '🟡', h: '🔴' };
const CROWD_RANK = { l: 1, m: 2, h: 3 };

// Worst realtime crowd level across a station's codes.
function worstCrowd(crowdMap, codes) {
  if (!crowdMap || !Array.isArray(codes)) return null;
  let worst = null;
  for (const c of codes) {
    const lv = crowdMap[String(c).toUpperCase()];
    if (lv && CROWD_RANK[lv] && (!worst || CROWD_RANK[lv] > CROWD_RANK[worst])) worst = lv;
  }
  return worst;
}

// Line hex for a station code (EW16 → EWL → #009645).
function codeHex(code) {
  const pc = parseCode(code);
  const ln = pc && PREFIX_TO_LINE[pc.prefix];
  return (ln && LINES_BY_CODE[ln]?.hex) || '#8E8E93';
}

export default function LineStatusPanel({ line, status, statusByLine = null, selectedStation = null, onSelectStation, lang = 'en', hideStationDetail = false }) {
  // v0.61.9 — station list for the focused line, fetched once.
  const [stations, setStations] = useState(null);
  // v0.61.14 — realtime crowd, for the selected-station detail line.
  const [crowd, setCrowd] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStations(Array.isArray(d.stations) ? d.stations : []); })
      .catch(() => { /* dropdown simply stays empty */ });
    fetch('/api/transport/crowd')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setCrowd(d.crowd || {}); })
      .catch(() => { /* crowd line just omitted */ });
    return () => { cancelled = true; };
  }, []);

  if (!line) return null;
  const s = status?.status || 'normal';
  const colour = STATUS_COLOR[s];
  const lineStops = stations ? lineStationsFull(stations, line.code) : [];
  // Dropdown summary: "35 stations · All normal" (or the disruption).
  const aggregate = s === 'normal' ? t('mrt.allNormal', lang) : t(`mrt.status.${s}`, lang);

  // v0.62.841 — HOW TO SAY the line's name. Operator: "do the hawker centre and
  // train line endpoint". `lineName()` returns the government register's Chinese /
  // Malay rendering where it has one, so zh and id readers never reach the network;
  // ja/es/de/ru/fr, which the register does not cover, are the only ones that do.
  const lineSay = usePronunciations([line.name].filter(Boolean), lang, {
    initData,
    curatedFor: (n) => {
      const local = lineName(line.code, n, lang);
      return local && local !== n ? local : null;
    },
  });

  // The currently-selected station's per-line service status + crowd.
  const selCrowd = selectedStation ? worstCrowd(crowd, selectedStation.codes) : null;

  return (
    // v0.60.97 — shrunk by half (operator 2026-05-11).
    <div className="rounded-lg border border-tg-border bg-tg-card p-2 sm:p-3 flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <LineBadge code={line.code} hex={line.hex} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight truncate">{lineName(line.code, line.name, lang)}</div>
          {/* v0.62.841 — the say-it line, only when the register had nothing: with a
              curated Chinese or Malay name the row above IS the answer.
              v0.62.888 — that rule is UNCHANGED and still right; what changed is
              what fills the slot. secondLine() puts the reader's-language name
              there when one exists and falls back to the say-it guide when it
              does not, so this renders one line or none, never both. */}
          {(() => {
            const sl = secondLine({ primary: lineName(line.code, line.name, lang), english: line.name, code: line.code, lang, say: lineSay.get(line.name) });
            if (!sl) return null;
            return (
              <div className="text-xs text-tg-hint leading-tight truncate flex items-center gap-1">
                {sl.key === 'say' && <PronounceIcon className="shrink-0 opacity-80" />}
                <span className="truncate">{sl.text}</span>
              </div>
            );
          })()}
          <div className="text-xs text-tg-hint truncate">For {line.endpoints?.[1] || '?'}</div>
          <div className="text-xs text-tg-hint truncate">{line.endpoints?.[0]} ↔ {line.endpoints?.[1]}</div>
        </div>
      </div>

      {/* v0.61.14 — status block now also holds the station dropdown
          and the selected-station detail. */}
      <div className="border-t border-tg-border pt-1.5 flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none" style={{ color: colour }}>{STATUS_ICON[s]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: colour }}>status: {STATUS_LABEL[s]}</div>
            {status?.cause && (
              <div className="text-xs text-tg-hint mt-0.5">cause: {status.cause}</div>
            )}
            {status?.direction && (
              <div className="text-xs text-tg-hint mt-0.5">section: {status.direction}</div>
            )}
            {status?.time && (
              <div className="text-xs text-tg-hint mt-0.5">since: {status.time}</div>
            )}
          </div>
        </div>

        {/* v0.61.14 — selected-station detail: each line's service
            status + the station's realtime platform crowd level.
            v0.62.598 — suppressed when the rich StationCard is shown
            (App renders StationCard for the selected station instead). */}
        {selectedStation && !hideStationDetail && (
          <div className="rounded-md bg-tg-bg border border-tg-border px-2 py-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <span aria-hidden>📍</span>
              <code className="text-[11px] font-semibold">{selectedStation.tappedCode}</code>
              <span className="truncate">{selectedStation.name}</span>
              {selectedStation.future && (
                <span className="text-[9px] text-tg-hint">({t('mrt.future', lang)})</span>
              )}
              <button
                type="button"
                onClick={() => onSelectStation?.(null)}
                aria-label={t('mrt.close', lang)}
                className="ml-auto text-tg-hint text-sm leading-none px-1 flex-shrink-0"
              >✕</button>
            </div>
            {(selectedStation.lines || []).map((ln) => {
              const ls = statusByLine?.[ln]?.status || 'normal';
              const lc = STATUS_COLOR[ls] || STATUS_COLOR.unknown;
              const label = STATUS_LABEL[ls] || ls;
              return (
                <div key={ln} className="flex items-center gap-1.5 text-xs">
                  <span aria-hidden style={{
                    display: 'inline-block', width: 9, height: 9, borderRadius: 2,
                    background: LINES_BY_CODE[ln]?.hex || '#8E8E93'
                  }} />
                  <span className="font-semibold">{ln}</span>
                  <span style={{ color: lc }}>· {label}</span>
                </div>
              );
            })}
            {selCrowd && (
              <div className="text-xs">{CROWD_DOT[selCrowd]} {t(`mrt.crowd.${selCrowd}`, lang)}</div>
            )}
          </div>
        )}

        {/* v0.61.14 — station dropdown, moved into the status block.
            Summary "{N} stations · All normal". */}
        {lineStops.length > 0 && (
          <details className="text-xs text-tg-hint">
            <summary className="cursor-pointer">
              {tn('mrt.stationsCount', lang, { n: lineStops.length })} · {aggregate}
            </summary>
            <ul className="mt-1 flex flex-col gap-1">
              {lineStops.map((st) => (
                <li key={`${st.focusCode}-${st.name}`} className="flex flex-wrap items-baseline gap-1">
                  {st.codes.map((c, i) => {
                    const picked = selectedStation
                      && selectedStation.name === st.name
                      && selectedStation.tappedCode === c;
                    return (
                      <React.Fragment key={c}>
                        {i > 0 && <span className="text-tg-hint" aria-hidden>⇋</span>}
                        <button
                          type="button"
                          onClick={() => onSelectStation?.(st, c)}
                          className={`gia-hit-s text-[10px] font-semibold rounded px-1 leading-tight ${picked ? 'ring-2 ring-offset-1 ring-tg-accent' : ''}`}
                          style={{ background: codeHex(c), color: '#fff' }}
                        >{c}</button>
                        {i === 0 && (
                          <span className="text-tg-text">· {st.name}</span>
                        )}
                        {i === 0 && st.future && (
                          <span className="text-[9px] text-tg-hint">({t('mrt.future', lang)})</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {status?.raw && s !== 'normal' && (
        <details className="text-xs text-tg-hint">
          <summary className="cursor-pointer">LTA notice</summary>
          <p className="mt-1 leading-snug">{status.raw}</p>
        </details>
      )}
    </div>
  );
}
