// ArrivalPlate.jsx — v0.62.32
//
// "What to try here" — the operator-chosen Screen-1 layout A: a COMPACT
// BANNER under the location pill, collapsed to one line, expanding on tap to
// tier-labelled dish rows. Each row: tap → fires the dish search at the set
// location; 📜 → a dismissible fact-card bubble whose text is CURATED
// (city-plates.js history.{en,fr} — never LLM-generated at runtime).
//
// Accessibility: tier + claim are WORDS, never colour; blue/amber accents
// only (colour-blind safe); rows are ≥44px touch targets; aria labels set.

import React, { useState, useEffect } from 'react';

const TIER_LABEL = {
  'city-icon':        { en: 'city icon',        fr: 'icône de la ville' },
  'regional':         { en: 'regional',         fr: 'régional' },
  'national-classic': { en: 'national classic', fr: 'classique national' }
};

// v0.62.37 — country label for the "More local classics" section (the
// overlay-fed list is national-level, so it's labelled by COUNTRY, honestly —
// never passed off as city-unique).
const COUNTRY_LABEL = {
  SG: { en: 'Singapore',   fr: 'singapouriens' },
  MY: { en: 'Malaysian',   fr: 'malaisiens' },
  TH: { en: 'Thai',        fr: 'thaïlandais' },
  JP: { en: 'Japanese',    fr: 'japonais' },
  VN: { en: 'Vietnamese',  fr: 'vietnamiens' },
  AU: { en: 'Australian',  fr: 'australiens' },
  NZ: { en: 'New Zealand', fr: 'néo-zélandais' }
};

export default function ArrivalPlate({ plate, lang = 'en', onTryDish }) {
  const [open, setOpen] = useState(false);
  const [factIdx, setFactIdx] = useState(null);   // index of the open 📜 bubble
  // v0.62.37 — the "More local classics" sub-section (overlay-fed, names only).
  const [classicsOpen, setClassicsOpen] = useState(false);
  // New city → collapse + close any bubble.
  useEffect(() => { setOpen(false); setFactIdx(null); setClassicsOpen(false); }, [plate?.city]);

  if (!plate || !Array.isArray(plate.dishes) || plate.dishes.length === 0) return null;
  const fr = lang === 'fr';
  const names = plate.dishes.map((d) => d.dish);

  return (
    <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
      {/* collapsed line — whole row toggles */}
      <button
        type="button"
        className="w-full text-left flex items-start gap-1 min-h-[28px]"
        aria-expanded={open}
        aria-label={fr ? `À goûter à ${plate.city}` : `What to try in ${plate.city}`}
        onClick={() => { setOpen(!open); setFactIdx(null); }}
      >
        <span aria-hidden>🍽</span>
        <span className="flex-1">
          <b>{fr ? 'À goûter ici' : 'What to try here'}:</b>{' '}
          {open ? (fr ? 'touchez un plat pour le chercher' : 'tap a dish to search it') : names.join(', ')}
        </span>
        <span aria-hidden className="text-tg-hint">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-1.5 flex flex-col">
          {plate.honestEmpty && (
            <div className="text-tg-hint pb-1">
              {fr
                ? `Pas de plat propre à ${plate.city} — spécialités régionales et classiques :`
                : `No ${plate.city}-only dish — regional specialities and classics:`}
            </div>
          )}
          {plate.dishes.map((d, i) => (
            <React.Fragment key={d.dish}>
              <div className="flex items-center gap-1.5 border-t border-tg-border/40">
                <button
                  type="button"
                  className="flex-1 text-left py-2.5 min-h-[44px]"
                  aria-label={(fr ? 'Chercher ' : 'Search ') + d.dish}
                  onClick={() => { if (onTryDish) onTryDish(d.dish); }}
                >
                  <span className="font-medium">{d.dish}</span>
                  {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
                  <span className="text-tg-hint"> — {(TIER_LABEL[d.tier] || {})[fr ? 'fr' : 'en'] || d.tier}</span>
                </button>
                <button
                  type="button"
                  className="px-2 py-2.5 min-h-[44px] min-w-[44px] text-[14px]"
                  aria-label={(fr ? 'Histoire de ' : 'History of ') + d.dish}
                  onClick={() => setFactIdx(factIdx === i ? null : i)}
                >📜</button>
              </div>
              {factIdx === i && (
                <button
                  type="button"
                  className="w-full text-left mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2"
                  aria-label={fr ? 'Fermer' : 'Close'}
                  onClick={() => setFactIdx(null)}
                >
                  <div className="font-semibold">📜 {d.dish}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                  <div className="mt-1">{(d.history && (fr ? d.history.fr : d.history.en)) || ''}</div>
                  <div className="mt-1 text-tg-hint">
                    {(TIER_LABEL[d.tier] || {})[fr ? 'fr' : 'en'] || d.tier} · {d.claim}
                    {d.differsFrom ? <> · {fr ? 'diffère de' : 'differs from'} {d.differsFrom}</> : null}
                  </div>
                  {Array.isArray(d.sources) && d.sources.length > 0 && (
                    <div className="mt-0.5 text-tg-hint">
                      {(fr ? 'source : ' : 'source: ') + d.sources.map((s) => s.name).join(' · ')}
                    </div>
                  )}
                  <div className="mt-1 text-tg-hint text-right">{fr ? '[ toucher pour fermer ]' : '[ tap to close ]'}</div>
                </button>
              )}
            </React.Fragment>
          ))}

          {/* v0.62.37 — "More local classics" (operator pick A): the country's
              NATION_OVERLAY iconic dishes, names only — no 📜 (curated-only
              rule). Labelled by COUNTRY, honestly — these are national, not
              city-unique. Tap a chip → the same dish search as the rows. */}
          {Array.isArray(plate.classics) && plate.classics.length > 0 && (() => {
            const cl = (COUNTRY_LABEL[plate.country] || {})[fr ? 'fr' : 'en'] || plate.country;
            return (
              <div className="border-t border-tg-border/40">
                <button
                  type="button"
                  className="w-full text-left py-2.5 min-h-[44px] flex items-center gap-1"
                  aria-expanded={classicsOpen}
                  onClick={() => setClassicsOpen(!classicsOpen)}
                >
                  <span aria-hidden className="text-tg-hint">{classicsOpen ? '▾' : '▸'}</span>
                  <span className="flex-1">
                    {fr ? `Autres classiques ${cl}` : `More ${cl} classics`}
                    <span className="text-tg-hint"> ({plate.classics.length})</span>
                  </span>
                </button>
                {classicsOpen && (
                  <div className="max-h-64 overflow-y-auto pb-2 flex flex-wrap gap-1.5">
                    {plate.classics.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="min-h-[44px] px-2.5 rounded-xl border border-tg-hint/40 text-left"
                        aria-label={(fr ? 'Chercher ' : 'Search ') + name}
                        onClick={() => { if (onTryDish) onTryDish(name); }}
                      >{name}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
