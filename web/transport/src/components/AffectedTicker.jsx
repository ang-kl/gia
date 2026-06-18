import React from 'react';
import LineBadge from './LineBadge.jsx';
import { LINES_BY_CODE } from '../data/lines.js';
import { t, useLocale } from '../i18n.js';

// v0.60.99 — operator follow-ups:
//   * "All Lines" reset chip at the start so users can clear the
//     focused line without scrolling back to the schematic toggle.
//   * Lighter border tone (border-tg-border, not the v0.60.97
//     tg-accent/40 which read as too saturated).
//   * Optional `statusByLine` prop. When present, the chip carries
//     a tiny status icon next to the line name so users see at a
//     glance which lines are operating normally vs delayed.
const STATUS_ICON = {
  delay:      '⚠️',
  disrupted:  '⛔',
  closure:    '🚧',
  normal:     '',         // hide for normal — implicit
  unknown:    ''
};

export default function AffectedTicker({ affectedCodes, focusedCode, onFocus, statusByLine, compact = false }) {
  const lang = useLocale();
  if (!affectedCodes?.length) {
    return (
      <div className="text-xs text-tg-hint italic px-3 py-2">
        {t('ticker.allNormal', lang)}
      </div>
    );
  }
  return (
    <div
      className={`rounded-2xl bg-tg-bg/90 liquid-glass flex flex-col ${compact ? 'px-1.5 py-1 gap-0' : 'px-2 py-2 gap-1.5'}`}
    >
      {/* v0.62.166 — compact (FAB) form drops the title row; the coloured line
          badges already read as a selector. Title moves to an aria-label. */}
      {!compact && <div className="text-xs font-semibold text-tg-text px-1">{t('ticker.title', lang)}</div>}
      <div className="overflow-x-auto whitespace-nowrap" aria-label={compact ? t('ticker.title', lang) : undefined}>
        <div className="inline-flex gap-2 min-w-full">
          {/* v0.60.99 — "All Lines" reset chip at the start of the
              scroll. Active when no focusedCode; tap clears the
              current focus and returns the map to overview. */}
          <button
            type="button"
            onClick={() => onFocus?.(null)}
            aria-pressed={!focusedCode}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap ${!focusedCode ? 'border-tg-text bg-tg-accent text-tg-accent-text font-semibold' : 'border-tg-border bg-tg-bg'}`}
          >
            <span className="text-xs">{t('ticker.allLines', lang)}</span>
          </button>
          {affectedCodes.map((code) => {
            const line = LINES_BY_CODE[code];
            if (!line) return null;
            const focused = code === focusedCode;
            const status = statusByLine?.[code]?.status || 'normal';
            const icon = STATUS_ICON[status] || '';
            return (
              <button
                key={code}
                onClick={() => onFocus?.(code)}
                aria-pressed={focused}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap ${focused ? 'border-tg-text' : 'border-tg-border'} bg-tg-bg`}
              >
                <LineBadge code={code} hex={line.hex} size="sm" />
                <span className="text-xs">{line.name}</span>
                {icon && <span className="text-[10px]" aria-label={status}>{icon}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
