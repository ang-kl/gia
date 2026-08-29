import React from 'react';
import LineBadge from './LineBadge.jsx';
import { useLocale } from '../i18n.js';
import { LINES_BY_CODE } from '../data/lines.js';
import { lineName } from '../../../_shared/lib/mrt-lines-i18n.generated.js';

const TYPE_ICON = {
  'early-closure':  '🌙',
  'late-opening':   '🌅',
  'closure':        '🚧',
  'extension-test': '🔬'
};

export default function EngineeringList({ closures }) {
  // v0.62.828 — the line name follows the locale here too. Wired at every site
  // rather than the convenient ones: a name that is Chinese on the status panel and
  // English in the engineering list is O-305's shape, one datum two call sites.
  const lang = useLocale();
  if (!closures?.length) return (
    <div className="text-xs text-tg-hint italic px-3 py-2">No scheduled engineering closures in the next 7 days.</div>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-semibold text-tg-text px-1">Upcoming engineering (next 7 days)</div>
      {closures.map((c, i) => {
        const line = LINES_BY_CODE[c.line];
        return (
          <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded border border-tg-border bg-tg-card">
            <span className="text-base leading-none mt-0.5">{TYPE_ICON[c.type] || '⚙️'}</span>
            {line && <LineBadge code={c.line} hex={line.hex} size="sm" />}
            <div className="flex-1 min-w-0 text-xs">
              <div><span className="font-semibold">{c.date}</span> · {c.direction || (line ? lineName(line.code, line.name, lang) : undefined)}</div>
              <div className="text-tg-hint">{c.time} · {c.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
