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
  NZ: { en: 'New Zealand', fr: 'néo-zélandais' },
  // v0.62.38 — the 8 markets lit up by the full curation pass.
  ID: { en: 'Indonesian',  fr: 'indonésiens' },
  PH: { en: 'Filipino',    fr: 'philippins' },
  KR: { en: 'Korean',      fr: 'coréens' },
  CN: { en: 'Chinese',     fr: 'chinois' },
  TW: { en: 'Taiwanese',   fr: 'taïwanais' },
  HK: { en: 'Hong Kong',   fr: 'hongkongais' },
  MO: { en: 'Macanese',    fr: 'macanais' },
  BN: { en: 'Bruneian',    fr: 'brunéiens' }
};

export default function ArrivalPlate({ plate, lang = 'en', onTryDish }) {
  const [open, setOpen] = useState(false);
  const [factIdx, setFactIdx] = useState(null);   // index of the open 📜 bubble
  // v0.62.37 — the "More local classics" sub-section (overlay-fed, names only).
  const [classicsOpen, setClassicsOpen] = useState(false);
  // New city / cuisine → collapse + close any bubble.
  useEffect(() => { setOpen(false); setFactIdx(null); setClassicsOpen(false); }, [plate?.city, plate?.cuisineSlug]);

  const fr = lang === 'fr';

  // v0.62.x — CUISINE "What to order" mode (operator: select Georgian in SG →
  // the unique Georgian dishes to discover BEFORE picking an eatery). Driven
  // by the selected cuisine's curated NATION_OVERLAY dishes, grouped by food
  // group (3 headliners, then ascending-size sections) so a 30-dish cuisine
  // doesn't jam-pack. Phase 2 adds the curated depth: every dish shows its
  // native-script name when curated, and each headliner carries a 📜 fact card
  // (one-line history, CURATED in nation-overlay.js — never LLM at runtime).
  // Replaces the geo city plate when a cuisine is selected.
  if (plate && plate.mode === 'cuisine') {
    const headliners = Array.isArray(plate.headliners) ? plate.headliners : [];
    const groups = Array.isArray(plate.groups) ? plate.groups : [];
    if (!headliners.length && !groups.length) return null;
    const title = `${plate.flag ? plate.flag + ' ' : ''}${plate.cuisineLabel || plate.cuisineSlug}`;
    const explainer = plate.explainer && (fr ? plate.explainer.fr : plate.explainer.en);
    return (
      <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
        <button
          type="button"
          className="w-full text-left flex items-start gap-1 min-h-[28px]"
          aria-expanded={open}
          aria-label={(fr ? 'À commander en ' : 'What to order in ') + (plate.cuisineLabel || plate.cuisineSlug)}
          onClick={() => { setOpen(!open); setFactIdx(null); }}
        >
          <span aria-hidden>🍽</span>
          <span className="flex-1">
            <b>{fr ? 'À commander en' : 'What to order in'} {title}:</b>{' '}
            {open
              ? (fr ? 'touchez un plat pour le chercher' : 'tap a dish to search it')
              : headliners.map((h) => h.dish).join(', ') + (groups.length ? '…' : '')}
          </span>
          <span aria-hidden className="text-tg-hint">{open ? '▴' : '▾'}</span>
        </button>

        {open && (
          <div className="mt-1.5 flex flex-col">
            {explainer && <div className="text-tg-hint pb-1.5">📜 {explainer}</div>}
            {plate.populationLow && (
              <div className="text-tg-hint pb-1.5">
                {fr ? 'Peu d’adresses ici — voici les classiques à connaître.' : 'Few spots here — these are the classics to know.'}
              </div>
            )}
            {/* headliners — full tappable rows (+ native name & 📜 history card) */}
            {headliners.map((d, i) => (
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
                    <span className="text-tg-hint"> — 🔍 {fr ? 'voir les adresses' : 'find eateries'}</span>
                  </button>
                  {d.note && (
                    <button
                      type="button"
                      className="px-2 py-2.5 min-h-[44px] min-w-[44px] text-[14px]"
                      aria-label={(fr ? 'Histoire de ' : 'History of ') + d.dish}
                      onClick={() => setFactIdx(factIdx === 'h' + i ? null : 'h' + i)}
                    >📜</button>
                  )}
                </div>
                {d.note && factIdx === 'h' + i && (
                  <button
                    type="button"
                    className="w-full text-left mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2"
                    aria-label={fr ? 'Fermer' : 'Close'}
                    onClick={() => setFactIdx(null)}
                  >
                    <div className="font-semibold">📜 {d.dish}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                    <div className="mt-1">{(fr ? d.note.fr : d.note.en) || d.note.en || ''}</div>
                    <div className="mt-1 text-tg-hint text-right">{fr ? '[ toucher pour fermer ]' : '[ tap to close ]'}</div>
                  </button>
                )}
              </React.Fragment>
            ))}
            {/* food-group sections, ascending size; dish chips → same search.
                v0.62.x Phase 2b — chips whose dish carries a curated `note`
                become a SPLIT chip: name → search, 📜 → fact card rendered
                full-width under the section (factIdx keyed group:dish). */}
            {groups.map((g) => {
              const openDish = g.dishes.find((d) => d.note && factIdx === g.group + ':' + d.dish);
              return (
              <div key={g.group} className="border-t border-tg-border/40 pt-1.5 pb-1">
                <div className="text-tg-hint text-[11px] pb-1">
                  {(fr ? g.label.fr : g.label.en)} <span className="opacity-70">({g.dishes.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.dishes.map((d) => d.note ? (
                    <span key={d.dish} className="inline-flex items-stretch rounded-xl border border-tg-hint/40 overflow-hidden">
                      <button
                        type="button"
                        className="min-h-[40px] pl-2.5 pr-1.5 text-left"
                        aria-label={(fr ? 'Chercher ' : 'Search ') + d.dish}
                        onClick={() => { if (onTryDish) onTryDish(d.dish); }}
                      >
                        <span>{d.dish}</span>
                        {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
                      </button>
                      <button
                        type="button"
                        className="min-h-[40px] px-2 border-l border-tg-hint/30 text-[13px]"
                        aria-label={(fr ? 'Histoire de ' : 'History of ') + d.dish}
                        onClick={() => setFactIdx(factIdx === g.group + ':' + d.dish ? null : g.group + ':' + d.dish)}
                      >📜</button>
                    </span>
                  ) : (
                    <button
                      key={d.dish}
                      type="button"
                      className="min-h-[40px] px-2.5 rounded-xl border border-tg-hint/40 text-left"
                      aria-label={(fr ? 'Chercher ' : 'Search ') + d.dish}
                      onClick={() => { if (onTryDish) onTryDish(d.dish); }}
                    >
                      <span>{d.dish}</span>
                      {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
                    </button>
                  ))}
                </div>
                {openDish && (
                  <button
                    type="button"
                    className="w-full text-left mt-1.5 mb-0.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2"
                    aria-label={fr ? 'Fermer' : 'Close'}
                    onClick={() => setFactIdx(null)}
                  >
                    <div className="font-semibold">📜 {openDish.dish}{openDish.local && openDish.local !== openDish.dish ? ` · ${openDish.local}` : ''}</div>
                    <div className="mt-1">{(fr ? openDish.note.fr : openDish.note.en) || openDish.note.en || ''}</div>
                    <div className="mt-1 text-tg-hint text-right">{fr ? '[ toucher pour fermer ]' : '[ tap to close ]'}</div>
                  </button>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    );
  }

  if (!plate || !Array.isArray(plate.dishes) || plate.dishes.length === 0) return null;
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
                  {/* v0.62.40 — operator: the tier word on the row "is
                      meaningless; has to tap to list which eateries offer
                      this dish". Row now shows the ACTION instead; the tier
                      + claim stay inside the 📜 fact card where they have
                      context. */}
                  <span className="text-tg-hint"> — 🔍 {fr ? 'voir les adresses' : 'find eateries'}</span>
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
