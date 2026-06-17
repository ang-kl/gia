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

// v0.62.113 — operator: dish names must read as a proper Title (each word
// capitalised) to look professional — not sentence-case. e.g. "Bak kut teh
// (Teochew)" → "Bak Kut Teh (Teochew)", "Wanton mee (SG style)" → "Wanton Mee
// (SG Style)". Title-cases the VISIBLE label only; the raw d.dish stays the
// search query, aria-label and React key. Uppercases the first letter of each
// word and leaves the rest untouched, so acronyms ("SG"), parenthetical
// qualifiers ("(Teochew)") and diacritics ("Phở") all survive (/u → \p{L}
// matches accented letters).
function titleCaseDish(s) {
  return String(s || '').replace(/[\p{L}][\p{L}'’]*/gu,
    (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

// v0.62.116 — operator: the one-line "peek" of the local-food-picks plate
// reformats each dish so the qualifier LEADS — "Laksa (Katong)" → "Katong
// Laksa", "Bak Kut Teh (Teochew)" → "Teochew Bak Kut Teh", "Wanton Mee (SG
// Style)" → "SG Wanton Mee" (the trailing word "Style" is dropped). Names with
// no parenthetical pass through unchanged. Display-only: d.dish stays the
// search query / aria-label / React key. Pair with titleCaseDish for casing.
function leadWithQualifier(s) {
  const m = String(s || '').match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return String(s || '').trim();
  const base = m[1].trim();
  const qual = m[2].trim().replace(/\s*\bstyle\b\s*$/i, '').trim();
  return qual ? `${qual} ${base}` : base;
}

export default function ArrivalPlate({ plate, lang = 'en', onTryDish }) {
  const [open, setOpen] = useState(false);
  const [factIdx, setFactIdx] = useState(null);   // index of the open 📜 bubble
  // v0.62.37 — the "More local classics" sub-section (overlay-fed, names only).
  const [classicsOpen, setClassicsOpen] = useState(false);
  // v0.62.116 — operator: the geo "Local food picks" plate is now a 3-STAGE
  // toggle (was a 2-state open/closed). Each tap advances 0 → 1 → 2 → 0:
  //   0 collapsed — the label only;
  //   1 peek      — label + a one-line "A • B • C" summary (leadWithQualifier);
  //   2 full      — label + the tap-to-search dish rows + "More classics".
  // So two taps fully expand, and one more tap closes. Separate from `open`,
  // which still drives the cuisine-mode "What to order" banner above.
  const [geoStage, setGeoStage] = useState(0);
  // v0.62.123 — operator: the cuisine-mode "Cuisine:" plate gets the SAME
  // 3-stage toggle the geo plate has (it was still a 2-state `open` — that's
  // why the two-tier collapse "wasn't wired"). 0 collapsed → 1 one-line peek →
  // 2 full → 0.
  const [cuisineStage, setCuisineStage] = useState(0);
  // New city / cuisine → collapse + close any bubble.
  useEffect(() => { setOpen(false); setGeoStage(0); setCuisineStage(0); setFactIdx(null); setClassicsOpen(false); }, [plate?.city, plate?.cuisineSlug]);

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
          aria-expanded={cuisineStage > 0}
          aria-label={'Cuisine: ' + (plate.cuisineLabel || plate.cuisineSlug)}
          onClick={() => { setCuisineStage((cuisineStage + 1) % 3); setFactIdx(null); }}
        >
          <span aria-hidden>🍽</span>
          <span className="flex-1">
            <b>{fr ? 'Cuisine :' : 'Cuisine:'} {title}</b>
            {cuisineStage === 1 && (
              <>{' '}{headliners.map((h) => titleCaseDish(h.dish)).join(', ') + (groups.length ? '…' : '')}</>
            )}
            {cuisineStage === 2 && (
              <>{' '}{fr ? 'Touchez un plat pour trouver des adresses. Touchez 📜 pour en savoir plus.' : 'Tap a dish to find eateries. Tap 📜 to learn more'}</>
            )}
          </span>
          <span aria-hidden className="text-tg-hint">{cuisineStage === 2 ? '▴' : '▾'}</span>
        </button>

        {cuisineStage === 2 && (
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
                    aria-label={(d.note ? (fr ? 'Expliquer ' : 'Explain ') : (fr ? 'Chercher ' : 'Search ')) + d.dish}
                    /* v0.62.162 — operator: EXPLAIN FIRST. A dish with a curated note
                       opens its explanation card (native script + the validated fact);
                       the card's "Find eateries" then runs the search. Curated-only —
                       no invented text. Dishes with no note search directly. */
                    onClick={() => { if (d.note) setFactIdx(factIdx === 'h' + i ? null : 'h' + i); else if (onTryDish) onTryDish(d.dish); }}
                  >
                    <span className="font-medium">{titleCaseDish(d.dish)}</span>
                    {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
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
                  <div className="mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                    <div className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                    <div className="mt-1">{(fr ? d.note.fr : d.note.en) || d.note.en || ''}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="glass-pill shrink-0 px-2.5 py-0.5 rounded-full border-[0.5px] border-tg-accent/70 text-[10px] font-semibold text-tg-text"
                        onClick={() => { setFactIdx(null); if (onTryDish) onTryDish(d.dish); }}
                      >🔍 {fr ? 'Trouver des adresses' : 'Find eateries'}</button>
                      <button
                        type="button"
                        className="text-tg-hint text-[12px]"
                        aria-label={fr ? 'Fermer' : 'Close'}
                        onClick={() => setFactIdx(null)}
                      >{fr ? '[ fermer ]' : '[ close ]'}</button>
                    </div>
                  </div>
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
                        aria-label={(fr ? 'Expliquer ' : 'Explain ') + d.dish}
                        /* v0.62.162 — explain first: a curated chip opens its card. */
                        onClick={() => setFactIdx(factIdx === g.group + ':' + d.dish ? null : g.group + ':' + d.dish)}
                      >
                        <span>{titleCaseDish(d.dish)}</span>
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
                      <span>{titleCaseDish(d.dish)}</span>
                      {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
                    </button>
                  ))}
                </div>
                {openDish && (
                  <div className="mt-1.5 mb-0.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                    <div className="font-semibold">📜 {titleCaseDish(openDish.dish)}{openDish.local && openDish.local !== openDish.dish ? ` · ${openDish.local}` : ''}</div>
                    <div className="mt-1">{(fr ? openDish.note.fr : openDish.note.en) || openDish.note.en || ''}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="glass-pill shrink-0 px-2.5 py-0.5 rounded-full border-[0.5px] border-tg-accent/70 text-[10px] font-semibold text-tg-text"
                        onClick={() => { const dish = openDish.dish; setFactIdx(null); if (onTryDish) onTryDish(dish); }}
                      >🔍 {fr ? 'Trouver des adresses' : 'Find eateries'}</button>
                      <button
                        type="button"
                        className="text-tg-hint text-[12px]"
                        aria-label={fr ? 'Fermer' : 'Close'}
                        onClick={() => setFactIdx(null)}
                      >{fr ? '[ fermer ]' : '[ close ]'}</button>
                    </div>
                  </div>
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

  // v0.62.169 — operator: "Local food picks" renamed to "Local Food Classic".
  // The card is BORDERLESS at rest; a border appears once the user opens it
  // (expands a stage OR opens a 📜 fact card) so it reads as a card only when active.
  const geoActive = geoStage > 0 || factIdx != null;
  return (
    <div className={`rounded-2xl ${geoActive ? 'border border-tg-border' : 'border border-transparent'} bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text`}>
      {/* v0.62.116 — 3-stage row toggle: 0 label-only → 1 one-line peek →
          2 full dish rows → 0. The whole row advances the stage. */}
      <button
        type="button"
        className="w-full text-left flex items-start gap-1 min-h-[28px]"
        aria-expanded={geoStage > 0}
        aria-label={fr ? `Classiques locaux à ${plate.city}` : `Local Food Classic in ${plate.city}`}
        onClick={() => { setGeoStage((geoStage + 1) % 3); setFactIdx(null); }}
      >
        <span aria-hidden>📍</span>
        <span className="flex-1">
          <b>{fr ? 'Classiques locaux' : 'Local Food Classic'}:</b>
          {geoStage === 1 && (
            <>{' '}{names.map((n) => titleCaseDish(leadWithQualifier(n))).join(' • ')}</>
          )}
          {geoStage === 2 && (
            <>{' '}{fr ? 'Touchez un plat pour trouver des adresses. Touchez 📜 pour en savoir plus.' : 'Tap a dish to find eateries. Tap 📜 to learn more'}</>
          )}
        </span>
        <span aria-hidden className="text-tg-hint">{geoStage === 2 ? '▴' : '▾'}</span>
      </button>

      {geoStage === 2 && (
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
                  aria-label={(fr ? 'Expliquer ' : 'Explain ') + d.dish}
                  /* v0.62.162 — operator: EXPLAIN FIRST. Tapping a Local-food-picks
                     dish opens its curated explanation card (native script + the
                     validated, sourced history + how it differs by region); the
                     card's "Find eateries" then runs the search. */
                  onClick={() => setFactIdx(factIdx === i ? null : i)}
                >
                  <span className="font-medium">{titleCaseDish(d.dish)}</span>
                  {d.local && d.local !== d.dish && <span className="text-tg-hint"> {d.local}</span>}
                  {/* v0.62.x — device-language gloss for native dish names
                      (operator: translate/explain e.g. "Phở Hà Nội" →
                      "Hanoi beef noodle soup"). Curated short {en,fr} in
                      city-plates.js; the long history stays in the 📜 card.
                      The per-row "find eateries" affordance was removed — the
                      header now explains the tap action once. */}
                  {d.gloss && (d.gloss.en || d.gloss.fr) && (
                    <span className="text-tg-hint"> · {(fr ? d.gloss.fr : d.gloss.en) || d.gloss.en}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="px-2 py-2.5 min-h-[44px] min-w-[44px] text-[14px]"
                  aria-label={(fr ? 'Histoire de ' : 'History of ') + d.dish}
                  onClick={() => setFactIdx(factIdx === i ? null : i)}
                >📜</button>
              </div>
              {factIdx === i && (
                <div className="mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                  <div className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
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
                  {/* v0.62.162 — explain-first: search runs only on "Find eateries". */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-[13px] font-semibold px-3 py-1.5 rounded-full bg-tg-accent text-tg-accent-text"
                      onClick={() => { setFactIdx(null); if (onTryDish) onTryDish(d.dish); }}
                    >🔍 {fr ? 'Trouver des adresses' : 'Find eateries'}</button>
                    <button
                      type="button"
                      className="text-tg-hint text-[12px]"
                      aria-label={fr ? 'Fermer' : 'Close'}
                      onClick={() => setFactIdx(null)}
                    >{fr ? '[ fermer ]' : '[ close ]'}</button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* v0.62.37 — "More local classics" (operator pick A): the country's
              NATION_OVERLAY iconic dishes, names only — no 📜 (curated-only
              rule). Labelled by COUNTRY, honestly — these are national, not
              city-unique. Tap a chip → the same dish search as the rows.
              v0.62.x — grouped into ascending food-group sections server-side
              (plate.classicGroups) so a long list reads organised, not a wall. */}
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
                {/* v0.62.x — "group the whole city plate": when the server has
                    grouped the classics by food group (plate.classicGroups), show
                    ascending-size labelled sections; else fall back to the flat
                    chip wall (back-compat / overlay-less countries). */}
                {classicsOpen && (() => {
                  // v0.62.169 — operator: NO pills. Show the classics as a
                  // middle-dot-separated tappable list of dish names. A dish with
                  // curated history (server attaches {note} to the classic) opens
                  // its explanation card; one without falls back to a direct search.
                  // (Full "every classic explains" needs the server to attach a
                  // curated note to ALL classics — tracked as a follow-up.)
                  const flat = Array.isArray(plate.classicGroups) && plate.classicGroups.length > 0
                    ? plate.classicGroups.flatMap((g) => g.dishes)
                    : (plate.classics || []).map((n) => ({ dish: n }));
                  const openCl = flat.find((d) => (d.note && (d.note.en || d.note.fr)) && factIdx === 'cl:' + d.dish);
                  return (
                    <div className="max-h-72 overflow-y-auto pb-2 px-1 text-[12px] leading-relaxed">
                      {flat.map((d, idx) => {
                        const hasNote = d.note && (d.note.en || d.note.fr);
                        return (
                          <React.Fragment key={d.dish}>
                            {idx > 0 && <span className="text-tg-hint"> · </span>}
                            <button
                              type="button"
                              className="text-tg-link no-underline active:scale-95 whitespace-nowrap"
                              aria-label={(hasNote ? (fr ? 'Expliquer ' : 'Explain ') : (fr ? 'Chercher ' : 'Search ')) + d.dish}
                              onClick={() => { if (hasNote) setFactIdx(factIdx === 'cl:' + d.dish ? null : 'cl:' + d.dish); else if (onTryDish) onTryDish(d.dish); }}
                            >{titleCaseDish(d.dish)}</button>
                          </React.Fragment>
                        );
                      })}
                      {openCl && (
                        <div className="mt-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                          <div className="font-semibold">📜 {titleCaseDish(openCl.dish)}{openCl.local && openCl.local !== openCl.dish ? ` · ${openCl.local}` : ''}</div>
                          <div className="mt-1">{(fr ? openCl.note.fr : openCl.note.en) || openCl.note.en || ''}</div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="glass-pill shrink-0 px-2.5 py-0.5 rounded-full border-[0.5px] border-tg-accent/70 text-[10px] font-semibold text-tg-text"
                              onClick={() => { const dish = openCl.dish; setFactIdx(null); if (onTryDish) onTryDish(dish); }}
                            >🔍 {fr ? 'Trouver des adresses' : 'Find eateries'}</button>
                            <button
                              type="button"
                              className="text-tg-hint text-[12px]"
                              aria-label={fr ? 'Fermer' : 'Close'}
                              onClick={() => setFactIdx(null)}
                            >{fr ? '[ fermer ]' : '[ close ]'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
