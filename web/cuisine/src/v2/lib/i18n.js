// i18n.js — v0.58.55
//
// Tiny EN/FR localisation layer for the cuisine TMA. Two languages
// only (English + French per Human Lead). No dependency on a big i18n
// runtime — a flat key-table + tiny React hook.
//
// Public surface:
//   t(key, lang?)       — pure string lookup, EN fallback
//   getActiveLocale()   — reads localStorage 'gia.locale' OR
//                         Telegram WebApp language_code OR navigator,
//                         maps to 'en' / 'fr' (default 'en')
//   setActiveLocale(l)  — writes localStorage + dispatches 'gia:locale'
//                         CustomEvent so all subscribed components
//                         re-render
//   useLocale()         — React hook returning [lang, setLang]
//
// Lookup is forgiving: missing keys fall back to the EN string. If the
// EN string is also missing, returns the key itself (so a missing
// translation still ships *some* legible text).

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';

const STRINGS = {
  // ----- TMA chrome -----
  'header.tagline':            { en: '💬 Tell me or 🔍 Search', fr: '💬 Dis-moi ou 🔍 Rechercher' },
  'region.singapore':          { en: 'Singapore', fr: 'Singapour' },
  'region.johor':              { en: 'Johor Bahru', fr: 'Johor Bahru' },
  // v0.61.159 — third region pill on the Cuisine TMA, part of the
  // location-classification phased build's PR 5/5.
  // v0.61.185 — pill semantics generalised from "Putrajaya" → "Others"
  // (matches location-mode.js's SG | JB | OTHER classifier). The
  // pill now covers any non-SG/JB anchor: Putrajaya, KL, Penang,
  // Batam, etc. Cap bumped 15 km → 20 km (operator's spec).
  'region.others':             { en: 'Others', fr: 'Autres' },
  // v0.60.213 — two-line footer.
  'footer.howto':              { en: '📍 Enter location or 💬 type dish · Tap 🔍 to search',
                                 fr: '📍 Saisir un lieu ou 💬 taper un plat · 🔍 pour rechercher' },
  'footer.experimental':       { en: 'Experimental', fr: 'Expérimental' },

  // ----- Banners (above map) -----
  'banner.locating':           { en: 'Searching nearby', fr: 'Recherche à proximité' },
  'banner.locating.suffix':    { en: 'finding places…', fr: 'recherche de lieux…' },
  'banner.anchor':             { en: 'Anchor set', fr: 'Point d’ancrage défini' },
  'banner.no.match':           { en: 'no places match — try Tell me, or share a fresh pin via /location.', fr: 'aucun lieu ne correspond — essayez Dis-moi, ou partagez une nouvelle position via /location.' },
  'banner.showing':            { en: 'Showing places', fr: 'Lieux affichés' },
  'banner.places.one':         { en: '1 place nearby', fr: '1 lieu à proximité' },
  'banner.places.many':        { en: '{n} places nearby', fr: '{n} lieux à proximité' },
  // v0.61.170 — Results-panel counter copy. Range-based labels for
  // the 24-first / 12-follow-up session model. Templates take
  // `{first}` (first-tap count), `{start}` / `{end}` (cumulative
  // range on subsequent taps), `{n}` (count for final/exhausted
  // states), and `{total}` (Michelin curated pool).
  // v0.61.174 — counter copy rewritten per operator's full spec
  // table. Format: `Results: {known} · Showing {start}-{end}` when
  // known total is known + multiple pages; `Results: {known} ·
  // Showing all` when single-page (≤ PAGE_SIZE) OR final page with
  // start=1; `Showing {n} results` when total still being
  // discovered (server-side cap not yet known); `Results: {cap}+ ·
  // Limit reached` when SEEN_CAP reached. Michelin keeps the curated
  // pool size as known total.
  // v0.61.190 — title is now rendered on TWO lines so the Copy
  // all / Copy syntax buttons on the right stay un-crowded.
  // line 1: "Results: {known}"
  // line 2: "· Showing {start}-{end}"   (or "Showing first {n}",
  //         or "Showing all", or "Limit reached")
  // The i18n keys below carry the SECOND line only; line 1 is
  // rendered inline by ResultPanel ("Results: {known}"). When the
  // total is unknown, line 1 is omitted and we fall back to the
  // single-line `panel.discovering` string.
  'panel.line1':               { en: 'Results: {known}',
                                 fr: 'Résultats : {known}' },
  'panel.line2.first':         { en: '· Showing first {first}',
                                 fr: '· Affichage des {first} premiers' },
  'panel.line2.range':         { en: '· Showing {start}-{end}',
                                 fr: '· Affichage de {start} à {end}' },
  'panel.line2.all':           { en: '· Showing all',
                                 fr: '· Tout afficher' },
  'panel.line2.limit':         { en: '· Limit reached',
                                 fr: '· Limite atteinte' },
  // Single-line fallback when total isn't yet known.
  'panel.discovering':         { en: 'Showing {n} results',
                                 fr: 'Affichage de {n} résultats' },
  // Helper line below header for the "too few results" state.
  'panel.helperTooFew':        { en: 'Change search or tap 🔍',
                                 fr: 'Modifiez la recherche ou touchez 🔍' },
  'panel.helperLimit':         { en: 'Refine search',
                                 fr: 'Affiner la recherche' },
  // v0.61.174 — speech-bubble tooltip that flashes above the 🔍 FAB
  // for 5 s after a fresh batch lands, replacing the v0.61.79 👉
  // arrow that sat to the left of the FAB.
  'panel.bubble.moreEats':     { en: 'More eats? Tap 🔍',
                                 fr: 'Plus à manger ? Touchez 🔍' },

  // v0.61.191 — OTHER-region country picker + place-search-by-country
  // confirmation modal. Operator: "Times Square Kuala Lumpur" was
  // resolving to a SG shop because OTHER autocomplete defaulted to
  // regionCode=SG. New flow: pick country flag → type → search →
  // confirmation list (no autocomplete dropdown for OTHER).
  'loc.other.country':         { en: 'Country', fr: 'Pays' },
  // v0.61.228 — cascading child city dropdown next to the country flag.
  'loc.other.city':            { en: 'City',    fr: 'Ville' },
  'loc.other.placeholder':     { en: 'Type a place name + 🔍',
                                 fr: 'Tapez un lieu + 🔍' },
  'loc.other.searchBtn':       { en: '🔍 Search', fr: '🔍 Rechercher' },
  'loc.other.searching':       { en: 'Searching {country}…',
                                 fr: 'Recherche {country}…' },
  'loc.other.noMatch':         { en: 'No places found in {country}. Try a different name.',
                                 fr: 'Aucun lieu trouvé en {country}. Essayez un autre nom.' },
  'loc.other.confirmHeader':   { en: 'Found in {flag} {country}:',
                                 fr: 'Trouvé en {flag} {country} :' },
  'loc.other.cancel':          { en: '✕ Cancel · type again',
                                 fr: '✕ Annuler · réessayer' },

  // ----- Filters -----
  'filter.openNow':            { en: 'Open now', fr: 'Ouvert maintenant' },
  'filter.halal':              { en: 'Halal', fr: 'Halal' },
  'filter.vegetarian':         { en: 'Vegetarian', fr: 'Végétarien' },
  // v0.62.37 — ⭐ Recommend (capital R per operator): wires the search to the
  // dish layer (cuisine special dishes + the city's unique dishes). The
  // 7-second explainer below shows on check.
  'filter.recommend':          { en: 'Recommend', fr: 'Recommander' },
  'filter.recommend.hint':     {
    en: '⭐ Recommend: highlights places whose own reviews serve this cuisine’s special dishes or this city’s unique dishes.',
    fr: '⭐ Recommander : met en avant les lieux dont les avis mentionnent les plats phares de cette cuisine ou les plats uniques de la ville.'
  },
  'filter.homeBased':          { en: 'Home-based', fr: 'À domicile' },
  'filter.newlyOpened':        { en: 'Newly opened', fr: 'Récemment ouvert' },
  // v0.60.165 — 🐾 Pet allowed chip. Strict mode shows only Places
  // tagged `allowsDogs=true`; text-query fallback when strict yields
  // < 3 venues. v0.60.166: capital P per operator second-pass review
  // ("Pet allowed", was "pet allowed").
  // v0.60.168: FR tightened from 'Animaux acceptés' (literally
  // "accepted") to 'Animaux autorisés' (literally "allowed") so it
  // tracks the EN "Pet allowed" semantically per operator review.
  // v0.60.182: shortened to "Pet" / "Animaux" (was "Pet allowed" /
  // "Animaux autorisés") — chip promoted to PRIMARY row beside Halal,
  // so the longer copy ate too much horizontal space on phones.
  'filter.petFriendly':        { en: 'Pet', fr: 'Animaux' },
  // v0.61.126 — Fruits + Durian exclusive special-mode toggles.
  // Per scripts/Create_2_buttons.MD: short labels, distinct from the
  // catalogue, mutually exclusive, grey-out normal cuisines + filters
  // when active. activeNote sits below the special-mode row to
  // remind the user other toggles are locked. limitedMatches surfaces
  // when the server-side post-filter trimmed the result count below
  // the spec's "8-12 relevant" target.
  'special.fruits.label':      { en: 'Fruits', fr: 'Fruits' },
  'special.durian.label':      { en: 'Durian', fr: 'Durian' },
  'special.activeNote':        { en: '{mode} mode is on — other cuisine, Michelin and dessert filters are locked. Tap the active button to clear.',
                                 fr: 'Mode {mode} activé — les autres filtres cuisine, Michelin et dessert sont verrouillés. Touchez le bouton actif pour effacer.' },
  'special.fruits.limited':    { en: '🍉 Limited matches nearby. Showing the closest fruit-related results.',
                                 fr: '🍉 Peu de résultats à proximité. Affichage des établissements liés aux fruits les plus proches.' },
  'special.durian.limited':    { en: '🥥 Limited durian sellers nearby. Showing the closest relevant matches.',
                                 fr: '🥥 Peu de vendeurs de durian à proximité. Affichage des résultats les plus proches.' },
  // v0.62.14 — durian soft-rating: we prefer 3.7★+ but a durian stall is a
  // durian stall, so lower-rated / unrated stalls are shown too (after the good ones).
  'special.durian.softRating': { en: '🥥 Durian stalls: we list 3.7★+ first, but also show lower-rated and unrated stalls — a durian stall is a durian stall.',
                                 fr: '🥥 Stands de durian : nous listons d’abord 3,7★+, mais affichons aussi les stands moins bien notés ou sans note — un stand de durian reste un stand de durian.' },
  // v0.61.397 — operator: durian / fruits / durian-pastry only make sense in
  // the SE-Asian durian belt; the server blocks them elsewhere and the panel
  // shows this in place of the generic empty-state. Belt = SG/MY/ID/TH/PH/BN/VN.
  'special.fruits.blocked':    { en: '🍉 Fruit search is only available in Singapore, Malaysia, Indonesia, Thailand, the Philippines, Brunei and Vietnam.',
                                 fr: '🍉 La recherche de fruits n’est disponible qu’à Singapour, en Malaisie, en Indonésie, en Thaïlande, aux Philippines, au Brunei et au Vietnam.' },
  'special.durian.blocked':    { en: '🥥 Durian search is only available in Singapore, Malaysia, Indonesia, Thailand, the Philippines, Brunei and Vietnam.',
                                 fr: '🥥 La recherche de durian n’est disponible qu’à Singapour, en Malaisie, en Indonésie, en Thaïlande, aux Philippines, au Brunei et au Vietnam.' },
  'special.durian-pastry.blocked': { en: '🥐 Durian-pastry search is only available in Singapore, Malaysia, Indonesia, Thailand, the Philippines, Brunei and Vietnam.',
                                 fr: '🥐 La recherche de pâtisseries au durian n’est disponible qu’à Singapour, en Malaisie, en Indonésie, en Thaïlande, aux Philippines, au Brunei et au Vietnam.' },
  // v0.61.411 — short tooltip on a durian / durian-pastry chip that's disabled
  // because the current country is outside the belt (the chip is greyed, not
  // tappable; the full sentence above only shows after a server-blocked search).
  'special.beltOnly':          { en: 'Only available in SG, MY, ID, TH, PH, BN, VN',
                                 fr: 'Disponible uniquement en SG, MY, ID, TH, PH, BN, VN' },
  // v0.61.130 — UI surface for v0.61.129 O-23 backend. When the
  // special-mode widening pass actually fired (radius escalated from
  // X to Y), append "· widened to Y km" below the limited card so
  // the user understands why the result list looks a bit further out
  // than the slider suggests.
  'special.widened':           { en: '· widened to {km} km',
                                 fr: '· élargi à {km} km' },
  // v0.61.130 — UI surface for v0.61.129 O-20 backend. Rendered as a
  // pill above the result list when the Tell-me box typed text named
  // a place (MRT station, hawker centre, STB precinct, or geocoded
  // landmark). `anchor.searching` is the place-only form; if the user
  // also typed a dish/qualifier alongside the place, the stripped
  // remainder is shown via `anchor.showing` instead.
  'anchor.searching':          { en: '📍 Searching near {place}',
                                 fr: '📍 Recherche près de {place}' },
  'anchor.showing':            { en: '📍 Showing "{query}" near {place}',
                                 fr: '📍 Affichage de « {query} » près de {place}' },
  'filter.price':              { en: 'Price', fr: 'Prix' },
  'filter.openPrice':          { en: 'Open price selector', fr: 'Ouvrir le sélecteur de prix' },
  'filter.closePrice':         { en: 'Close price selector', fr: 'Fermer le sélecteur de prix' },
  'filter.openMore':           { en: 'Open more filters', fr: 'Ouvrir plus de filtres' },
  'filter.closeMore':          { en: 'Close more filters', fr: 'Fermer plus de filtres' },

  // ----- Rating pill + panel (v0.61.426) -----
  'rating.title':              { en: 'Minimum rating', fr: 'Note minimale' },
  'rating.refineHeader':       { en: 'Refine Google Rating', fr: 'Affiner la note Google' },
  'rating.openPanel':          { en: 'Open rating options', fr: 'Ouvrir les options de note' },
  'rating.closePanel':         { en: 'Close rating options', fr: 'Fermer les options de note' },
  'rating.noRating':           { en: 'Unrated', fr: 'Non noté' },
  'rating.noRatingHint':       { en: 'New or no reviews yet', fr: 'Nouveau ou sans avis' },
  'rating.anyRating':          { en: 'Any rating', fr: 'Toutes les notes' },
  'rating.anyRatingHint':      { en: 'No minimum', fr: 'Aucun minimum' },
  'rating.goodPlus':           { en: 'Good+', fr: 'Bien+' },
  'rating.setRating':          { en: 'Set rating', fr: 'Définir la note' },
  'rating.custom':             { en: 'Custom', fr: 'Personnalisée' },
  'rating.customHint':         { en: 'Choose 1.0 to 5.0', fr: 'Choisir 1.0 à 5.0' },
  'rating.save':               { en: 'Save', fr: 'Enregistrer' },
  'rating.saved':              { en: 'Saved', fr: 'Enregistré' },
  'rating.pillNoRating':       { en: 'Unrated', fr: 'Non noté' },

  // ----- Zero-result reason notices (v0.62.13) — make an empty list EVIDENT -----
  'zero.allSeen':              { en: 'No new places to show here — tap 🔍 again to refresh the list.',
                                 fr: 'Plus de nouveaux lieux ici — touchez 🔍 pour rafraîchir la liste.' },
  'zero.noMatchCriteria':      { en: 'No matches for this cuisine + filter combo — try removing a filter or a cuisine.',
                                 fr: 'Aucune correspondance pour cette combinaison cuisine + filtre — retirez un filtre ou une cuisine.' },
  'zero.noVenuesNearby':       { en: 'No rated places found nearby — try a wider area or a different spot.',
                                 fr: 'Aucun lieu noté à proximité — élargissez la zone ou changez d’endroit.' },
  // v0.62.x item 10 — honest-empty for a tapped dish: nothing nearby has
  // verified evidence of serving it (after the distance + off-cuisine gate).
  'zero.dishNoSpot':           { en: 'No spot nearby has verified evidence of this dish — try another dish, or search a city where the cuisine is common.',
                                 fr: 'Aucun établissement à proximité n’a de preuve vérifiée de ce plat — essayez un autre plat ou une ville où cette cuisine est courante.' },
  // ----- Michelin zero/miss notices (v0.61.437) -----
  'michelin.noList':           { en: 'No Michelin Guide covers this country yet — pick another country or deselect ✳️ Michelin.',
                                 fr: "Aucun Guide Michelin ne couvre encore ce pays — choisissez un autre pays ou désélectionnez ✳️ Michelin." },
  'michelin.unresolved':       { en: 'Could not work out which country to load the Michelin list for — pick a city or country, then search again.',
                                 fr: "Impossible de déterminer le pays pour la liste Michelin — choisissez une ville ou un pays, puis relancez la recherche." },
  'michelin.comboMiss':        { en: 'No match for your selected cuisine in this Michelin list — showing the full Michelin list instead.',
                                 fr: "Aucune correspondance pour la cuisine choisie dans cette liste Michelin — affichage de la liste Michelin complète." },
  // ----- Michelin city-jump rows (v0.62.6; v0.62.x — count/total ratio) -----
  // Text BEFORE the tappable city name in "{count}/{total} Michelin picks in
  // {city}" (the city itself renders as a styled <span>, so the string stops
  // at "in "). count = cards for that city in the current visible batch;
  // total = the visible batch size (e.g. 8/12). Operator (11-06) switched the
  // copy from the bare count to the count/total ratio.
  'michelin.cityJump.before':  { en: '{count}/{total} Michelin picks in ',
                                 fr: '{count}/{total} choix Michelin à ' },
  'rating.pillAny':            { en: 'Any', fr: 'Toutes' },

  // ----- Map overlay layers (v0.61.0) -----
  'layer.parks':               { en: 'Park', fr: 'Parc' },
  'layer.attractions':         { en: 'Attractions', fr: 'Attractions' },
  'layer.taxis':               { en: 'Taxi Stand', fr: 'Station de taxi' },
  'layer.clinics':             { en: 'Clinic / Pharmacy', fr: 'Clinique / Pharmacie' },
  'layer.hospitals':           { en: 'Hospital', fr: 'Hôpital' },
  'layer.police':              { en: 'Police', fr: 'Police' },
  'layer.carpark':             { en: 'Carpark', fr: 'Parking' },
  'layer.exits':               { en: 'Station Exits', fr: 'Sorties de station' },
  'layer.train':               { en: 'Train Line', fr: 'Ligne de train' },
  'layer.busstop':             { en: 'Bus Stop', fr: 'Arrêt de bus' },
  'layer.colour':              { en: 'Colour', fr: 'Couleur' },
  'layer.colour.on':           { en: '☑️ Monochrome', fr: '☑️ Monochrome' },
  'layer.colour.off':          { en: '🎨 Color', fr: '🎨 Couleur' },
  'layer.open24':              { en: '24 hours', fr: '24 heures' },
  'map.reset':                 { en: 'Reset view', fr: 'Réinitialiser' },
  'map.more':                  { en: 'More layers', fr: 'Plus de couches' },
  'layer.all':                 { en: 'All', fr: 'Tout' },

  // ----- Cuisine drawer -----
  'cuisine.drawerTitle':       { en: 'Cuisines', fr: 'Cuisines' },
  'cuisine.back':              { en: 'Back', fr: 'Retour' },
  'cuisine.done':              { en: 'Done', fr: 'Terminé' },

  // ----- Buttons -----
  'btn.search':                { en: '🔍 Search', fr: '🔍 Rechercher' },
  'btn.searching':             { en: 'Searching…', fr: 'Recherche…' },
  // v0.60.43 — replaces the hardcoded "…" literal in the criteria-card
  // Search pill. Per Human Lead 2026-05-08 — the bare ellipsis read
  // as "broken" rather than "loading"; explicit prose reassures.
  'btn.searchPleaseWait':      { en: 'Please wait …', fr: 'Veuillez patienter …' },
  'btn.searchFull':            { en: '🔍 Search · Show me places to eat', fr: '🔍 Rechercher · Trouvez où manger' },
  'btn.clear':                 { en: 'Clear', fr: 'Effacer' },
  // v0.60.43 — drawer "Clear all" relabel. The criteria-card pill
  // ("Clear") wipes EVERYTHING (cuisines + filters + region); the
  // drawer's button only wipes cuisines. Renaming makes the narrower
  // scope explicit.
  'btn.clearCuisines':         { en: 'Clear cuisines', fr: 'Effacer les cuisines' },
  'btn.copyAll':               { en: '📋 Copy all', fr: '📋 Tout copier' },
  'btn.copied':                { en: '✓ Copied to chat', fr: '✓ Copié vers le chat' },
  'btn.copySyntax':            { en: '🔗 Copy /cuisine command', fr: '🔗 Copier la commande /cuisine' },
  'btn.copyOne':               { en: '📋 Copy', fr: '📋 Copier' },
  'btn.collapse':              { en: 'Collapse ▴', fr: 'Réduire ▴' },
  'btn.editSearch':            { en: 'Edit search ▾', fr: 'Modifier la recherche ▾' },
  'btn.backToTop':             { en: 'Back to top', fr: 'Retour en haut' },
  // v0.60.106 — FAB labels (back / end). Operator FR audit 2026-05-11.
  'btn.fabBack':               { en: 'back',  fr: 'retour' },
  'btn.fabEnd':                { en: 'end',   fr: 'fermer' },
  'btn.fabBackAria':           { en: 'Back',  fr: 'Retour' },
  'btn.fabEndAria':            { en: 'End',   fr: 'Fermer' },
  // v0.60.58 — short-form label for the FAB ("⇡ top" / "⇡ haut").
  // The long-form key above stays as the aria-label for screen readers.
  'btn.topShort':              { en: '⇡ top', fr: '⇡ haut' },
  // v0.60.95 — operator standardised down/top/end labels across TMAs.
  'btn.downShort':             { en: '⇣ down', fr: '⇣ bas' },
  'btn.showLocation':          { en: 'Show your location', fr: 'Afficher votre position' },

  // ----- Result card -----
  'card.open':                 { en: 'Open', fr: 'Ouvert' },
  'card.closed':               { en: 'Closed', fr: 'Fermé' },
  // v0.59.23 / v0.59.24 — "Try ·" line on cuisine ResultCards
  // (mirrors /hidden's signature_dish surface). Per Human Lead
  // 2026-05-07: label trimmed to a tight "Try ·" form, same emoji
  // glyph used at the start of the dish line.
  'card.whatToOrder':          { en: 'Try', fr: 'Essayez' },
  'card.healthierChoice':      { en: 'Healthier Choice', fr: 'Choix santé' },
  'card.insideBuilding':       { en: 'Inside a building complex', fr: 'Dans un complexe immobilier' },

  // ----- End-of-list / dedup exhaustion (v0.60.115/117) -----
  'result.exhausted':          { en: '— You’ve now seen all {n} places I can find for these criteria, across several searches. Add or change a cuisine / filter, or use 💬 Tell me, to widen things — or ',
                                 fr: '— Vous avez vu les {n} établissements que je peux trouver pour ces critères, sur plusieurs recherches. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi, pour élargir — ou ' },
  'result.exhaustedOne':       { en: '— That’s the only place I can find for these criteria. Add or change a cuisine / filter, or use 💬 Tell me, to find more — or ',
                                 fr: '— C’est le seul établissement que je peux trouver pour ces critères. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi — ou ' },
  'result.exhaustedNoCount':   { en: '— You’ve now seen everything I can find for these criteria, across several searches. Add or change a cuisine / filter, or use 💬 Tell me, to widen things — or ',
                                 fr: '— Vous avez tout vu pour ces critères, sur plusieurs recherches. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi, pour élargir — ou ' },
  'result.startOver':          { en: '↺ start over.', fr: '↺ recommencer.' },

  // ----- Zero-results auto-retry CTA (v0.60.157) -----
  'result.noMatchAfterRetry':  { en: 'No matches even after a fresh search. Try widening your criteria above, or tap below to reset filters and try again.',
                                 fr: 'Aucun résultat même après une nouvelle recherche. Essayez d’élargir vos critères ci-dessus, ou touchez ci-dessous pour réinitialiser les filtres et réessayer.' },
  'btn.resetFiltersRetry':     { en: '🔄 Reset filters & retry', fr: '🔄 Réinitialiser et réessayer' },

  // ----- Tell me panel -----
  'tellme.placeholder':        { en: 'What are you craving? e.g. spicy thai', fr: 'Quelle est votre envie ? ex. thaï épicé' },
  'tellme.aria':               { en: 'Tell me what you’re craving', fr: 'Dites-moi ce dont vous avez envie' },
  'tellme.submit':             { en: 'Submit', fr: 'Envoyer' },

  // ----- Location field -----
  'loc.searchLocation':        { en: 'Search location', fr: 'Rechercher un lieu' },
  // v0.61.50 — loading-overlay messages (operator-specified copy).
  // v0.61.409 — leading ⏳ removed; the overlay card now renders a SPINNING
  // hourglass within the message (operator: "the spinning hourglass be within
  // the message"). Keeping it in the string too would double the glyph.
  'loading.initial':           { en: 'Please wait while loading random eateries…',
                                 fr: 'Chargement de restaurants aléatoires…' },
  'loading.refresh':           { en: '📑 Refreshing results with the same filters…',
                                 fr: '📑 Actualisation des résultats avec les mêmes filtres…' },
  'loading.head':              { en: 'Loading…', fr: 'Chargement…' },
  'loading.rotating.1':        { en: '⏳ Looking for places that match criteria',
                                 fr: '⏳ Recherche de lieux correspondant aux critères' },
  'loading.rotating.2':        { en: '🔍 Matching places to your filters…',
                                 fr: '🔍 Mise en correspondance des lieux avec vos filtres…' },
  'loading.rotating.3':        { en: '🔎 Checking Google Maps for matching eateries…',
                                 fr: '🔎 Recherche de restaurants correspondants sur Google Maps…' },
  'loading.rotating.4':        { en: '📋👀 Searching eateries…',
                                 fr: '📋👀 Recherche de restaurants…' },
  'loading.rotating.5':        { en: '🔦 Checking places…',
                                 fr: '🔦 Vérification des lieux…' },
  'loading.rotating.6':        { en: '🔍 Searching — this takes more than a few seconds.',
                                 fr: '🔍 Recherche — cela prend plus de quelques secondes.' },
  'loc.searchHere':            { en: 'Search at this location', fr: 'Rechercher à cet endroit' },
  'loc.clear':                 { en: 'Clear location', fr: 'Effacer le lieu' },
  'loc.recent':                { en: 'Recent locations', fr: 'Emplacements récents' },
  'loc.close':                 { en: 'Close', fr: 'Fermer' },

  // ----- MapPanel InfoWindow -----
  'map.expand':                { en: 'Expand map', fr: 'Agrandir la carte' },
  'map.collapse':              { en: 'Collapse map', fr: 'Réduire la carte' },
  'map.zoomIn':                { en: 'Zoom in', fr: 'Zoom avant' },
  'map.zoomOut':               { en: 'Zoom out', fr: 'Zoom arrière' },
  'map.youAreHere':            { en: 'You are here', fr: 'Vous êtes ici' },
  'map.yourAnchor':            { en: 'your search anchor', fr: 'votre point d’ancrage' },
  'map.tapPin':                { en: 'Tap pin → Google Maps', fr: 'Touchez l’épingle → Google Maps' },
  'map.openInMaps':            { en: '📍 Open in Google Maps', fr: '📍 Ouvrir dans Google Maps' },

  // ----- Errors / toasts -----
  'err.copyFailed':            { en: 'Couldn’t send to chat — try again.', fr: 'Impossible d’envoyer au chat — réessayez.' },
  'err.commandFailed':         { en: 'Couldn’t send the command. Try again in a moment.', fr: 'Impossible d’envoyer la commande. Réessayez dans un instant.' },

  // ----- Locale toggle -----
  'locale.switchToEn':         { en: 'Switch to English', fr: 'Passer en anglais' },
  'locale.switchToFr':         { en: 'Switch to French', fr: 'Passer en français' },

  // ----- Location field (v0.59.12) -----
  'loc.enterHint':             { en: '↵ Press Enter to use the top result', fr: '↵ Appuyez sur Entrée pour le premier résultat' },
  'loc.noMatch':               { en: 'No match — try a more specific name', fr: 'Aucun résultat — essayez un nom plus précis' },

  // ----- Cuisine drawer category labels (v0.59.6) -----
  // Server returns canonical EN labels via /api/cuisine/catalogue. The
  // TMA renders via this lookup keyed by category id so the drawer
  // cards flip with the active locale. Keys mirror cuisines-vault.js
  // CATEGORY_META ids.
  'cat.commonHere':            { en: 'Common in Singapore', fr: 'Courant à Singapour' },
  'cat.southeastAsian':        { en: 'Southeast Asian', fr: 'Asie du Sud-Est' },
  'cat.eastAsian':             { en: 'East Asian', fr: 'Asie de l’Est' },
  'cat.chinaRegional':         { en: 'China (Regional)', fr: 'Chine (régional)' },
  'cat.southAsian':            { en: 'South Asian', fr: 'Asie du Sud' },
  'cat.middleEastern':         { en: 'Middle Eastern & Central Asian', fr: 'Moyen-Orient & Asie centrale' },
  'cat.european':              { en: 'European', fr: 'Européenne' },
  'cat.americas':              { en: 'Americas', fr: 'Amériques' },
  'cat.australasia':           { en: 'Australasia', fr: 'Australasie' },
  'cat.african':               { en: 'African', fr: 'Africaine' },

  // v0.61.278 — O-25: surfaced when the server's JB-hybrid filter
  // wipes the pool (JB pill picked at non-JB coords) and falls back
  // to OTHER-country treatment. The user otherwise sees results
  // without knowing the system overrode their JB pick.
  'banner.jbFallbackToOther':  { en: 'Showing results near your location — Johor Bahru filter didn’t apply at this distance.',
                                 fr: 'Affichage des résultats près de vous — le filtre Johor Bahru ne s’applique pas à cette distance.' },

  // v0.61.280 — Register O-31: sparse notice rendered in the cuisine
  // drawer when region !== 'SG'. The ✳️ Michelin chip is greyed (it
  // ships with regionScope:'SG'); this caption explains why so the
  // user doesn't read greyed-out as broken.
  'drawer.michelinSgOnly':     { en: '✳️ No curated Michelin list for this location yet.',
                                 fr: '✳️ Pas encore de liste Michelin pour ce lieu.' },

  // v0.61.285 — FunFactModal strings. Replaces the static rotating
  // "still loading" titles during the cuisine-search wait window
  // with a floating NLB-sourced SG food-history fact (40 curated).
  'funfact.header':            { en: 'Did you know?',
                                 fr: 'Le saviez-vous ?' },
  'funfact.curating':          { en: 'Still curating…',
                                 fr: 'Recherche en cours…' },
  'funfact.sourceLabel':       { en: 'Source',
                                 fr: 'Source' },
  'funfact.stop':              { en: '🛑 Stop loading', fr: '🛑 Arrêter le chargement' },
  'loading.stop':              { en: '🛑 Stop loading', fr: '🛑 Arrêter le chargement' }
};

export const SUPPORTED_LOCALES = ['en', 'fr'];

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

// Substitute {placeholder} tokens in a translated string.
// Only used where pluralisation / dynamic-N is needed.
export function tn(key, lang, vars = {}) {
  const raw = t(key, lang);
  return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

function detectFromTelegram() {
  if (typeof window === 'undefined') return null;
  const tg = window.Telegram?.WebApp;
  const code = tg?.initDataUnsafe?.user?.language_code;
  if (typeof code !== 'string') return null;
  const two = code.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(two) ? two : null;
}

function detectFromNavigator() {
  if (typeof navigator === 'undefined') return null;
  const code = navigator.language || (navigator.languages && navigator.languages[0]);
  if (typeof code !== 'string') return null;
  const two = code.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(two) ? two : null;
}

export function getActiveLocale() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if (SUPPORTED_LOCALES.includes(stored)) return stored;
    } catch { /* private mode / quota — fall through */ }
  }
  return detectFromTelegram() || detectFromNavigator() || 'en';
}

export function setActiveLocale(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) return;
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LOCALE_KEY, lang); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang } }));
  // v0.59.0: best-effort POST to /api/cuisine/user-language so chat
  // replies (deliverPicks, free-text, /hidden) follow the same
  // preference. Lazy-import to avoid a circular dep at module init.
  import('./api.js').then((m) => m.setUserLanguageRemote?.(lang)).catch(() => {});
}

// v0.59.0: track whether we've hydrated from the server's per-user
// preference. Module-level latch so multiple useLocale() calls in
// different components don't each fire a redundant fetch.
let serverHydrated = false;
async function hydrateFromServerOnce() {
  if (serverHydrated) return;
  serverHydrated = true;
  try {
    const m = await import('./api.js');
    const remote = await m.fetchUserLanguage?.();
    if (SUPPORTED_LOCALES.includes(remote)) {
      // Quietly write to localStorage + fire the locale event so
      // every subscribed component re-renders. Skip the POST that
      // setActiveLocale would otherwise make (the value just came
      // from the server — round-tripping is wasteful).
      try { window.localStorage.setItem(LOCALE_KEY, remote); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang: remote } }));
    }
  } catch { /* offline / 401 / 404 — keep local fallback */ }
}

// React hook: returns [lang, setLang]. Re-renders on locale change
// (own setActiveLocale call OR another tab — storage + custom event).
// On first mount, hydrates from the server's stored preference so the
// TMA matches whatever the user last set via /language in chat.
export function useLocale() {
  const [lang, setLangState] = useState(() => getActiveLocale());
  useEffect(() => {
    function onLocale(e) {
      const next = e?.detail?.lang || getActiveLocale();
      setLangState(next);
    }
    function onStorage(e) {
      if (e.key === LOCALE_KEY) setLangState(getActiveLocale());
    }
    window.addEventListener(LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    hydrateFromServerOnce();
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [lang, (next) => { setActiveLocale(next); setLangState(next); }];
}
