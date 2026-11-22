import React from 'react';
import LineBadge from './LineBadge.jsx';
import { LINES_BY_CODE } from '../data/lines.js';
import { lineName } from '../../../_shared/lib/mrt-lines-i18n.generated.js';
import { secondLine } from '../../../_shared/lib/name-second-line.js';
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

export default function AffectedTicker({ affectedCodes, focusedCode, onFocus, statusByLine, compact = false, blinkCode = null }) {
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
      /* v0.62.620 — operator: the compact (header) line-pills scroller drops its
         own card/border — the pills sit directly on the header. Non-compact keeps
         the rounded glass card. */
      className={`flex flex-col ${compact ? 'gap-0' : 'rounded-2xl bg-tg-bg/90 liquid-glass px-2 py-2 gap-1.5'}`}
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
            // v0.62.659 — first-load onboarding: blink the suggested line's
            // chip (shares the schematic's `.line-flash` keyframe, styles.css)
            // until the user taps any chip.
            const blinking = code === blinkCode;
            const sl = secondLine({ primary: lineName(line.code, line.name, lang), english: line.name, code: line.code, lang });
            return (
              <button
                key={code}
                onClick={() => onFocus?.(code)}
                aria-pressed={focused}
                aria-label={icon ? `${lineName(line.code, line.name, lang)} · ${t(`mrt.status.${status}`, lang)}` : undefined}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border whitespace-nowrap ${focused ? 'border-tg-text' : 'border-tg-border'} bg-tg-bg ${blinking ? 'line-flash' : ''}`}
              >
                <LineBadge code={code} hex={line.hex} size="sm" />
                {/* v0.62.890 — THE CARVE-OUT IS RETIRED, and it was mine to retire.
                    v0.62.888 left this strip English on my reasoning that a second
                    line "doubles the height of a header the compact layout
                    deliberately shrinks" — a judgement made about a visual this
                    environment cannot render. The operator then ran the app in
                    Korean, photographed THIS strip, and said: "Have the train TMA
                    resolve the translated line." A carve-out argued from a guess
                    does not outrank the person who can see the screen. */}
                <span className="flex flex-col min-w-0 leading-tight text-left">
                  <span className="text-xs">{lineName(line.code, line.name, lang)}</span>
                  {sl && <span className="text-[10px] text-tg-hint">{sl.text}</span>}
                </span>
                {icon && <span className="text-[10px]" aria-hidden="true">{icon}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
