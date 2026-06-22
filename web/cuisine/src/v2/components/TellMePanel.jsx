import React, { useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';
import Icon from './Icon.jsx';

// v0.59.0: standalone "Tell me" panel — replaces the v0.57.30 FlipPanel
// back-face textarea + flip animation. Always visible below the map
// so the user can type a natural-language query without first flipping
// a card. Internally still calls handleNLSubmit (route /api/cuisine/
// nl-query) — server-side guardrails from v0.58.19 (verifyInitData,
// 60/hr rate limit, 120 km anchor cap) are unchanged.
//
// v0.60.126: controlled input — the parent owns the text (`value` /
// `onChange`) so the Search-criteria 🔍 search can pick it up as a
// `freeText` qualifier instead of silently dropping it. Also: Enter no
// longer fires a search — only the → button here or the 🔍 Search
// buttons / FAB do (operator 2026-05-11).
export default function TellMePanel({ value = '', onChange, onSubmit, onReplace, lastPrompt, loading, searchIcon = false, onEmptySearch, searchDisabled = false, searchPulse = false, autoFocus = false, onBlurClose }) {
  const [lang] = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const text = typeof value === 'string' ? value : '';

  async function submit() {
    const t = text.trim();
    // v0.62.178 — operator: the end button is now the 🔍 SEARCH (→ merged into the
    // FAB). With text → submit the free-text; empty → run the criteria search.
    if (!t) { if (searchIcon && onEmptySearch && !searchDisabled && !loading) onEmptySearch(); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(t);
      onChange?.('');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="flex flex-col gap-1 px-0.5">
      {/* v0.62.147 — operator: the "Last asked …" remark sits ABOVE the free-text
          field, not below it.
          v0.62.167 — operator: the last-searched text ITSELF is now the link that
          replaces the search (tap "satay" to replace). The separate "Replace
          instead of merge" link is removed. */}
      {lastPrompt && !submitting && (
        <div className="text-[11px] text-tg-hint px-1.5 italic">
          {lang === 'fr' ? 'Dernière demande' : 'Last asked'}:{' '}
          {onReplace ? (
            <button
              onClick={onReplace}
              className="not-italic underline text-tg-link active:scale-95"
              aria-label={lang === 'fr' ? `Remplacer la recherche par « ${lastPrompt} »` : `Replace the search with "${lastPrompt}"`}
              title={lang === 'fr' ? 'Remplacer au lieu de fusionner' : 'Replace instead of merge'}
            >"{lastPrompt}"</button>
          ) : (
            <span>"{lastPrompt}"</span>
          )}
        </div>
      )}
      {/* v0.60.207 — operator: in Telegram dark mode the default
          `tg-border` (≈#2a2a2e) is near-invisible against `tg-card`
          (≈#1c1c1f), so the free-text box had no perceptible edge.
          Switched to a `tg-hint`-based border at 60% opacity — a
          medium-contrast colour the Telegram theme adapts for both
          light and dark — and bumped to a 2px width so the input
          reads as a distinct, tappable field. */}
      {/* v0.62.189 — operator (IMG_2516): trim the free-text bar height ~20%
          (py-1.5 → py-1, FAB 9 → 8) so the map/results get more room. */}
      {/* v0.62.206 — operator: the free-text field was a curved pill that read
          with "white spacing" in dark mode. Make it a square-edged BOX
          (rounded-md) with a solid card fill. */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-md border-2 border-tg-hint/60 bg-tg-card">
        <Icon name="message" className="w-4 h-4 text-tg-hint flex-shrink-0" />
        <input
          type="text"
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => { if (onBlurClose) setTimeout(() => onBlurClose(), 150); }}
          disabled={submitting || loading}
          autoFocus={autoFocus}
          placeholder={tr('tellme.placeholder', lang)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint min-w-0"
          aria-label={tr('tellme.aria', lang)}
        />
        {/* v0.62.178 — operator: the → submit is MERGED with the 🔍 search FAB at
            the end of the (now end-to-end) bar. searchIcon makes it the round 🔍
            that searches whether or not text is typed; it inherits the FAB's
            disable (pool exhausted) + pulse (hint/flash) states. */}
        <button
          type="button"
          onClick={submit}
          disabled={(searchIcon ? (searchDisabled || loading) : (!text.trim() || submitting || loading))}
          aria-label={searchIcon
            ? (lang === 'fr' ? 'Rechercher · Trouvez où manger' : 'Search · Show me places to eat')
            : tr('tellme.submit', lang)}
          className={searchIcon
            ? `w-8 h-8 rounded-full bg-tg-accent text-tg-accent-text border-2 border-white/40 shadow-lg flex items-center justify-center text-base disabled:opacity-40 flex-shrink-0 transition-all active:scale-95 ${
                (searchPulse || (text.trim() && !submitting && !loading)) && !searchDisabled ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''
              }`
            : `text-xs px-2.5 py-1 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-40 flex-shrink-0 transition-all ${
                text.trim() && !submitting && !loading ? 'animate-pulse ring-2 ring-offset-1 ring-tg-accent' : ''
              }`}
        >{submitting ? '…' : (searchIcon
          ? <Icon name="search" className="w-[18px] h-[18px]" />
          : <Icon name="arrow-right" className="w-4 h-4" />)}</button>
      </div>
    </div>
  );
}
