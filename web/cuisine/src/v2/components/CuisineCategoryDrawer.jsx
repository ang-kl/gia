import React, { useEffect } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';
// v0.61.193 — SG-only cuisine slugs (fruits / durian / durian-pastry).
// When region !== 'SG', these chips are dimmed + disabled (operator's
// guidance from v0.61.191 retrospective). Curated `searchQuery` strings
// in cuisines-vault hardcode "Singapore" for these, so they degenerate
// outside SG — disabling avoids confusing 0-result searches.
import { SG_ONLY_SLUGS } from '../lib/sg-only-slugs.js';

// v0.59.6: keep in sync with CuisineDrawer's CATEGORY_LABEL_KEY map.
const CATEGORY_LABEL_KEY = {
  'common-here':     'cat.commonHere',
  'southeast-asian': 'cat.southeastAsian',
  'east-asian':      'cat.eastAsian',
  'china-regional':  'cat.chinaRegional',
  'south-asian':     'cat.southAsian',
  'middle-eastern':  'cat.middleEastern',
  'european':        'cat.european',
  'americas':        'cat.americas',
  'australasia':     'cat.australasia',
  'african':         'cat.african'
};

// v0.59.0: drill-down overlay for a single cuisine category. Replaces
// the v0.58.x inline-expansion drawer (which fought CSS-grid row
// heights and produced ragged chip-wraps in narrow cells). Layout:
// fixed full-screen overlay with a back-arrow header and a 2-column
// grid of flag-prefixed pills. Tapping a pill toggles selection;
// tapping back-arrow / scrim closes.
export default function CuisineCategoryDrawer({ category, selected, onToggle, onClose, maxSelected, region = 'SG' }) {
  // v0.61.193 — when region !== 'SG', the SG-only chip set is locked.
  const sgOnlyLocked = region !== 'SG';
  const [lang] = useLocale();
  // ESC closes the overlay (desktop / Telegram-Web users).
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!category) return null;

  const labelKey = CATEGORY_LABEL_KEY[category.id];
  const localisedLabel = labelKey ? tr(labelKey, lang) : category.label;
  const selectedInCat = category.cuisines.filter((c) => selected.includes(c.slug)).length;

  return (
    // v0.58.29: was a full-screen `fixed inset-0` overlay which made
    // the bottom "Done" button hard to reach on tall phones. Reworked
    // as a backdrop-scrim + centered modal capped at min(560 px,
    // 90vh / 90vw) so the user perceives it as a popup and the Done
    // button is always visible without scrolling the body.
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-label={`${localisedLabel} cuisines`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="flex flex-col w-full max-w-[480px] max-h-[80vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden"
      >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('cuisine.back', lang)}
          className="text-tg-accent text-base leading-none px-1 py-0.5"
        >←</button>
        <span aria-hidden>{category.emoji}</span>
        <h2 className="text-sm font-semibold flex-1 truncate">{localisedLabel}</h2>
        {selectedInCat > 0 && (
          <span className="text-tg-accent text-xs font-semibold">[{selectedInCat}]</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-2 gap-1.5">
          {category.cuisines.map((cu) => {
            const sel = selected.includes(cu.slug);
            // v0.61.193 — SG-only chips (fruits / durian / durian-pastry)
            // locked when region !== 'SG'. Always dim + disabled; never
            // selectable while the lock is active.
            const sgOnly = SG_ONLY_SLUGS.has(cu.slug);
            const regionLocked = sgOnly && sgOnlyLocked;
            const dim = (!sel && selected.length >= maxSelected) || regionLocked;
            return (
              <button
                key={cu.slug}
                type="button"
                onClick={() => onToggle(cu.slug)}
                aria-pressed={sel}
                disabled={(dim && !sel) || regionLocked}
                title={regionLocked
                  ? (lang === 'fr' ? 'Singapour uniquement — passez à la région SG.' : 'Singapore-only — switch region to SG.')
                  : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs leading-tight whitespace-normal text-left transition-colors ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : `bg-tg-card text-tg-text border-tg-border ${dim ? 'opacity-40' : 'hover:border-tg-accent'}`}`}
              >
                {/* v0.61.142 — operator-supplied PNG icon for the
                    durian chip (cuisines-vault.IMG_FLAG_BY_SLUG ships
                    `imgFlag: "durian.png"` on the cuisine entry).
                    Falls back to the emoji `flag` (or the default
                    🍽️ plate) when the file fails to load — so a
                    missing asset never leaves the chip iconless.
                    Other cuisines (without imgFlag) continue to
                    render the emoji span as before. */}
                {cu.imgFlag ? (
                  <span aria-hidden className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4">
                    <img
                      src={`/app/cuisine/${cu.imgFlag}`}
                      alt=""
                      width="16"
                      height="16"
                      className="w-4 h-4 object-contain"
                      onError={(e) => {
                        // Hide the broken <img>, then show the emoji
                        // fallback sibling.
                        e.currentTarget.style.display = 'none';
                        const fb = e.currentTarget.nextElementSibling;
                        if (fb) fb.style.display = 'inline';
                      }}
                    />
                    <span style={{ display: 'none' }} className="text-base leading-none">{cu.flag || '🍽️'}</span>
                  </span>
                ) : (
                  <span aria-hidden className="flex-shrink-0 text-base leading-none">{cu.flag || '🍽️'}</span>
                )}
                <span className="flex-1 break-words">{cu.name}</span>
                {sel && <span aria-hidden className="text-tg-accent-text flex-shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
        {selected.length >= maxSelected && (
          <div className="text-[11px] text-tg-hint italic mt-3 px-1">
            Max {maxSelected} cuisines selected. Untoggle one to add another.
          </div>
        )}
      </div>
      <div className="px-3 py-3 border-t border-tg-border bg-tg-card">
        <button
          type="button"
          onClick={onClose}
          className="w-full text-xs font-semibold px-3 py-2 rounded-2xl bg-tg-accent text-tg-accent-text"
        >{tr('cuisine.done', lang)}</button>
      </div>
      </div>
    </div>
  );
}
