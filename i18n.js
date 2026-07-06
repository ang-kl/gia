// i18n.js — v0.58.55 (server-side)
//
// Mirror of web/cuisine/src/v2/lib/i18n.js for the bot/server. Keeps
// EN as the default and FR as the only added locale. Used by:
//   - venue-templates.js  (Open now / Closed / weekday labels in T1/T2/T3)
//   - open-hours.js       ("Closed today · Opens tomorrow at 11:00 AM")
//   - index.js endpoints  (/api/cuisine/copy-all / copy-one / copy-syntax)
//   - deliverPicks chat headers
//
// Language is plumbed through requests as a `lang` field (TMA POST body
// or per-chat preference cached in Redis). Falls back to 'en' when
// missing or unsupported.
//
// v0.62.511 — expanded SUPPORTED to all 8 TMA locales (en/fr/id/ru/de/zh/ja/es)
// so users who set /language to a non-EN/FR code see native text for the
// /language UI strings (language.current, language.cleared, language.fromTg).
// All other strings fall back to 'en' via t()'s entry[l]||entry.en guard.

const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

const STRINGS = {
  // Pick-list headers
  'pick.header.one':           { en: '📋 1 place', fr: '📋 1 lieu' },
  'pick.header.many':          { en: '📋 {n} places', fr: '📋 {n} lieux' },
  'pick.results.for':          { en: '🔎 Results for', fr: '🔎 Résultats pour' },
  // v0.60.145 — surfaced when /api/cuisine/copy-all has venues that
  // all lack coordinates (so buildMapHashUrl returns null); the body
  // still sends, just without the inline map button.
  'pick.mapUnavailable':       { en: '📍 Map unavailable for this set.', fr: '📍 Carte indisponible pour cette sélection.' },

  // venue-templates.js — formatHoursLine
  'hours.openNow':             { en: 'Open now', fr: 'Ouvert maintenant' },
  'hours.closed':              { en: 'Closed',   fr: 'Fermé' },

  // open-hours.js — closedTodayString
  'hours.closedToday':         { en: 'Closed today',     fr: 'Fermé aujourd’hui' },
  'hours.opensTomorrowAt':     { en: 'Opens tomorrow at {time}', fr: 'Ouvre demain à {time}' },
  'hours.opensInDays':         { en: 'Opens in {n} days', fr: 'Ouvre dans {n} jours' },
  'hours.opensTodayAt':        { en: 'Opens today at {time}', fr: 'Ouvre aujourd’hui à {time}' },

  // venue-templates.js — formatStatsLine crowd labels (carry parity with
  // ResultCard so the pasted message + on-screen card match)
  'crowd.high':                { en: '🔴 busy',     fr: '🔴 chargé' },
  'crowd.medium':              { en: '🟡 moderate', fr: '🟡 modéré' },
  'crowd.low':                 { en: '🟢 quiet',    fr: '🟢 calme' },

  // copy-syntax — wrapper line above the /cuisine command
  'syntax.wrapper':            { en: 'Re-run this search anytime by tapping or pasting:', fr: 'Relancez cette recherche à tout moment en touchant ou collant :' },

  // v0.59.0 — bot chrome (most-trafficked chat replies)
  'bot.busy':                  { en: '⏳ Soleat is still working on your last request — hold on a moment.',
                                 fr: '⏳ Soleat traite encore votre dernière demande — un instant.' },
  'bot.location.prompt':       { en: '📍 Tap to share your current location.',
                                 fr: '📍 Touchez pour partager votre position actuelle.' },
  'bot.location.locale':       { en: '📍 Share your location once so Soleat uses your locale (or type `/location <place name>` to set it manually).',
                                 fr: '📍 Partagez votre position une fois pour que Soleat utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).' },
  'bot.noresults':             { en: 'No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search.',
                                 fr: 'Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche.' },
  'bot.error.freetext':        { en: 'Sorry, free-text search hit an error. Try /cuisine or /hidden.',
                                 fr: 'Désolé, la recherche libre a rencontré une erreur. Essayez /cuisine ou /hidden.' },
  // v0.60.123/127/130 — two-line divider in a free-text dish search
  // reply: above = venues that self-identify as the cuisine/dish;
  // below = eateries with similar dishes or cuisine (e.g. a 灌汤包 place
  // for "bread dumplings"). The dish name sits on its own (second) line
  // so the first line doesn't wrap. Operator-specified copy 2026-05-11.
  // v0.60.133 — dash runs trimmed from `──` to `─` each side (operator:
  // the doubled box-drawing dashes wrapped/looked ugly).
  'freetext.divider':          { en: '⇩─ Eateries with similar dishes or cuisine ─ ⇩\n⇩─ not exactly {dish} ─ ⇩',
                                 fr: '⇩─ Établissements aux plats ou cuisine similaires ─ ⇩\n⇩─ pas exactement {dish} ─ ⇩' },
  // v0.60.135 — shown above a free-text / /s dish-search result list
  // when EVERY returned venue is an obvious cuisine mismatch (Google
  // text-matched the words but nothing actually serves the dish).
  'freetext.allBelow':         { en: '⚠️ <i>No Singapore eateries clearly serve {dish} — these just matched your search words:</i>',
                                 fr: '⚠️ <i>Aucun établissement à Singapour ne sert clairement {dish} — voici ceux qui correspondent juste à vos mots-clés :</i>' },
  // v0.60.128 — "misrepresented dish" note. Surfaced on the free-text
  // dish-search paths (chat + Cuisine TMA "Tell me" box) when the typed
  // term names a dish from data/Misrepresented Dish Dessert Drink.MD.
  // Informational only; the {note} text stays English (source data is
  // English-only). Caller HTML-escapes {name} / {note}.
  'misrep.note':               { en: 'ℹ️ <b>{name}</b> — {note}',
                                 fr: 'ℹ️ <b>{name}</b> — {note}' },
  // v0.60.129 — "Did you mean a cooking method?" pivot prompt. Fired
  // on the free-text dish-search paths (chat + Cuisine TMA + /s) when
  // the typed term names one or more cooking methods from
  // data/cooking method reference by cuisine.md (+ the baseline
  // cooking-methods.js dict). Source data is English; FR users get a
  // localised framing with English method names.
  'cookmethod.didYouMean':     { en: '🙂 <i>Were you perhaps after a cooking method?</i> Tap a cuisine below, or search literally.',
                                 fr: '🙂 <i>Cherchiez-vous peut-être une méthode de cuisson ?</i> Touchez une cuisine ci-dessous, ou cherchez tel quel.' },
  // v0.60.131 — free-text "looks like a question" decline. Shown when
  // someone types a sentence ("does Beach Road curry rice sell chiffon
  // cake") instead of a dish / cuisine name. Distinct from /s.
  'freetext.questionDeclined': { en: "🍛 Please try a dish name, cooking method, or food term - e.g. Mee Soto, char kway teow, or goulash dumpling",
                                 fr: "🍛 Essayez un nom de plat, une méthode de cuisson ou un terme culinaire - par ex. Mee Soto, char kway teow ou goulash dumpling" },
  // v0.60.228 — transport queries (MRT / bus / "how to get to X")
  // aren't food searches; point the user at the /transport tool.
  'freetext.transportRedirect': { en: "🚆 For trains, buses, and getting around Singapore, tap /transport. This chat searches for food and eateries.",
                                  fr: "🚆 Pour les trains, bus et déplacements à Singapour, tapez /transport. Ce chat recherche des plats et des restaurants." },
  'cookmethod.literalBtn':     { en: '🔍 Search literally',
                                 fr: '🔍 Rechercher tel quel' },
  // v0.61.171 — chat free-text "Search 🔍 for more" follow-up after a
  // free-text search result batch. moreHint: the body line above the
  // inline keyboard when fresh results may remain. moreBtn: the inline
  // button itself. recycleBtn: the "↺" reset button that clears the
  // seen-set and re-runs the same query. noMore: shown when the
  // seen-set is exhausted (either the cap was hit or no fresh results
  // came back). expired: shown if the user taps an old button whose
  // stored query has rolled out of Redis (>30 min TTL).
  'freetext.moreHint':         { en: '💡 Want different picks for the same search?',
                                 fr: '💡 Voulez-vous d\'autres suggestions pour la même recherche ?' },
  'freetext.moreBtn':          { en: '🔍 Search for more',
                                 fr: '🔍 Voir d\'autres résultats' },
  'freetext.recycleBtn':       { en: '↺ Start over',
                                 fr: '↺ Recommencer' },
  'freetext.noMore':           { en: '🔚 No more matching results · Change criteria or tap ↺ to start over.',
                                 fr: '🔚 Plus de résultats correspondants · Modifiez les critères ou touchez ↺ pour recommencer.' },
  'freetext.expired':          { en: '⌛ That search has expired. Please re-type your query.',
                                 fr: '⌛ Cette recherche a expiré. Veuillez ressaisir votre requête.' },
  // v0.61.122 — /location quick-pick buttons (10 STB precincts + Johor
  // Bahru + IOI Resort City Putrajaya). Header for the inline-keyboard
  // message, plus the confirmation reply that fires from the locpick
  // callback. Cap note is appended when the picked anchor enforces a
  // search-radius ceiling (JB → 30 km, IOI → 15 km).
  // v0.62.85 — operator: simpler prompt. Was "🗺 Quick-pick anchor — tap a
  // precinct or Malaysia city below, or share your live pin above:".
  'loc.precinct.prompt':       { en: '📍 Choose a city below, or saved location',
                                 fr: '📍 Choisissez une ville ci-dessous, ou un lieu enregistré' },
  'loc.set.success':           { en: '📍 Location set to <b>{label}</b>.{cap}',
                                 fr: '📍 Position définie sur <b>{label}</b>.{cap}' },
  // v0.61.412 — operator: when the user PICKS a new search area in a TMA and
  // returns to chat, confirm it. Fires only on a deliberate pick AND an actual
  // area change (never on app-open / auto-detect). {label} is HTML-escaped.
  'loc.searchArea.set':        { en: '📍 Area set: {area}\n\nUse <code>/location</code> or <code>/l &lt;place&gt;</code> · change address',
                                 fr: '📍 Zone définie : {area}\n\nUtilisez <code>/location</code> ou <code>/l &lt;lieu&gt;</code> · changer d’adresse' },
  'loc.set.capNote':           { en: ' Searches anchored here are capped to {km} km.',
                                 fr: ' Les recherches sont limitées à {km} km autour de ce point.' },
  'loc.set.unknown':           { en: "⚠️ I don't recognise that quick-pick. Tap one of the buttons or share a pin.",
                                 fr: "⚠️ Je ne reconnais pas cette sélection. Touchez l'un des boutons ou partagez une position." },
  // v0.61.124 — after the user taps a /location quick-pick, offer a
  // one-tap follow-up to run a place-anchored search at the picked
  // anchor (instead of making them type a query). callback_data is
  // `locsearch:<precinctId>`.
  // v0.62.83 — was sent with parse_mode:'Markdown' (so the _italic_ rendered but
  // the <b> tags showed literally). Now HTML, matching loc.set.success. Also drop
  // the over-claiming "top"/"meilleurs": the place-anchored search returns
  // rating-floored NEARBY eateries (the button just says "See eateries here"),
  // not a curated top-list — so don't promise "top".
  'loc.searchPick.prompt':     { en: '<i>Want to see eateries at <b>{place}</b>?</i>',
                                 fr: '<i>Voulez-vous voir les établissements à <b>{place}</b> ?</i>' },
  'loc.searchPick.btn':        { en: '🔍 See eateries here',
                                 fr: '🔍 Voir les établissements ici' },
  // v0.61.119 — place-anchored search (hawker centre / MRT / mall /
  // building / address typed in chat free-text). Header above the
  // venue list, the button that fans out to better-rated nearby
  // eateries, and the header above that nearby list.
  'place.foundN':              { en: '📍 <b>{place}</b> — found {n} eateries here',
                                 fr: '📍 <b>{place}</b> — {n} établissements trouvés ici' },
  // v0.61.124 — "showing {shown} of {total}" format requested by the
  // operator: when the place has more eateries than fit in one reply
  // (cap 12), surface the ratio so the user knows there are more.
  'place.foundShownOfTotal':   { en: '📍 <b>{place}</b> — showing {shown} of {total} eateries here',
                                 fr: '📍 <b>{place}</b> — {shown} sur {total} établissements ici' },
  // v0.61.124 — auto-suggest intro when the place itself is weak
  // (< 5 eateries OR average rating < 4.0). Sent ahead of the
  // automatic nearby fan-out so the user understands why we're
  // showing extras without them tapping the button.
  'place.autoNearbyIntro':     { en: '_Slim pickings at <b>{place}</b> — here are the top-rated eateries nearby:_',
                                 fr: '_Peu d’options à <b>{place}</b> — voici les mieux notés à proximité :_' },
  // v0.61.124 — "outside the zone" header for precinct anchors
  // (Marina Bay, Chinatown, etc.) where the polygon exclusion filters
  // out venues inside the precinct itself.
  'place.outsideHeader':       { en: '✨ <b>Top {n} eateries outside {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements hors de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' },
  'place.outsideEmpty':        { en: '🤷 No standout eateries outside {place} (within {km} km) right now.',
                                 fr: '🤷 Aucun établissement marquant hors de {place} (dans un rayon de {km} km) en ce moment.' },
  'place.foundEmpty':          { en: "📍 <b>{place}</b> — couldn't find eateries here. Showing top-rated nearby instead.",
                                 fr: "📍 <b>{place}</b> — aucun établissement ici. Voici les mieux notés à proximité." },
  'place.nearbyBtn':           { en: '✨ Top eateries nearby',
                                 fr: '✨ Meilleurs établissements à proximité' },
  'place.nearbyHeader':        { en: '✨ <b>Top {n} eateries near {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements près de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' },
  'place.nearbyEmpty':         { en: '🤷 No standout eateries within {km} km of {place} right now.',
                                 fr: '🤷 Aucun établissement marquant dans un rayon de {km} km de {place} en ce moment.' },
  'place.expired':             { en: '⏱ That suggestion expired. Type the place name again to refresh.',
                                 fr: '⏱ Cette suggestion a expiré. Tapez à nouveau le nom du lieu pour actualiser.' },
  'bot.location.share':        { en: "📍 Tap to share your location, or type a place name. I'll search after.",
                                 fr: '📍 Touchez pour partager votre position, ou tapez un nom de lieu. Je chercherai ensuite.' },
  'bot.lang.set.en':           { en: '✅ Language set to English.', fr: '✅ Language set to English.' },
  'bot.lang.set.fr':           { en: '✅ Langue réglée sur français.', fr: '✅ Langue réglée sur français.' },
  // v0.62.480 — acks for the extended /language set. Each shows in the
  // chosen tongue (en+fr keys carry the same native string) so the user
  // gets confirmation in the language they just picked. The line notes
  // that the confirmation applies to the Mini-App surfaces.
  'bot.lang.set.id':           { en: '✅ Bahasa disetel ke Indonesia (untuk Mini App).', fr: '✅ Bahasa disetel ke Indonesia (untuk Mini App).' },
  'bot.lang.set.ru':           { en: '✅ Язык переключён на русский (для мини-приложений).', fr: '✅ Язык переключён на русский (для мини-приложений).' },
  'bot.lang.set.de':           { en: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).', fr: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).' },
  'bot.lang.set.zh':           { en: '✅ 语言已设置为中文（用于小程序）。', fr: '✅ 语言已设置为中文（用于小程序）。' },
  'bot.lang.set.ja':           { en: '✅ 言語を日本語に設定しました（ミニアプリ用）。', fr: '✅ 言語を日本語に設定しました（ミニアプリ用）。' },
  'bot.lang.set.es':           { en: '✅ Idioma configurado en español (para las Mini Apps).', fr: '✅ Idioma configurado en español (para las Mini Apps).' },

  // v0.59.1 — chat chrome localisation. Covers /weather, /transport (+ all
  // sub-views), /hawker, /carpark, /forgetme, /language, /start intro.
  // Shared button labels (used across multiple surfaces).
  'button.back':               { en: '⬅️ Back', fr: '⬅️ Retour' },
  'button.refresh':            { en: '🔄 Refresh', fr: '🔄 Actualiser' },

  // /weather
  'weather.title':             { en: '☀️ Singapore weather', fr: '☀️ Météo de Singapour' },
  'weather.temp':              { en: 'Temperature: {c}°C · {f}°F', fr: 'Température : {c} °C · {f} °F' },
  'weather.humidity':          { en: 'Humidity: {pct}%', fr: 'Humidité : {pct} %' },
  'weather.rain':              { en: 'Rain: {mm} mm @ {at}', fr: 'Pluie : {mm} mm @ {at}' },
  'weather.wind':              { en: 'Wind: {kt} kt{dir}', fr: 'Vent : {kt} kt{dir}' },
  'weather.forecastNext2h':    { en: 'Next 2 hours in {area}: {desc}{valid}', fr: 'Prochaines 2 h à {area} : {desc}{valid}' },
  'weather.forecastUntil':     { en: ' (until {time})', fr: ' (jusqu’à {time})' },
  'weather.unreachable':       { en: "Sorry, I can't reach the NEA weather feed right now.", fr: "Désolé, le flux météo NEA est inaccessible pour le moment." },
  // v0.60.118 — /weather expansion
  'weather.areaUnknown':       { en: "I don't know that area — try a town name like Tampines, or just /weather to use your shared pin.", fr: "Je ne connais pas cette zone — essayez un nom de quartier comme Tampines, ou simplement /weather pour utiliser votre position partagée." },
  'weather.forArea':           { en: '— for {area} —', fr: '— pour {area} —' },
  'weather.headOutRaining':    { en: "☔ Raining around {area} right now — hold ~20–30 min or pick somewhere covered.", fr: "☔ Il pleut autour de {area} en ce moment — patientez ~20–30 min ou choisissez un endroit couvert." },
  'weather.headOutShowery':    { en: "🌦️ Dry now, but {area}'s 2-hour outlook is {desc} — head out soon if you're going somewhere open-air.", fr: "🌦️ Sec pour l’instant, mais les prévisions 2 h à {area} sont : {desc} — sortez bientôt si vous allez en plein air." },
  'weather.headOutGood':       { en: "✅ Good window — {area} looks dry for the next 2 hours.", fr: "✅ Bon créneau — {area} devrait rester au sec pendant 2 h." },
  'weather.hotNudge':          { en: "🥵 Feels hot out — an air-conditioned spot might be nicer.", fr: "🥵 Il fait chaud dehors — un endroit climatisé serait peut-être plus agréable." },
  'weather.tonight':           { en: "🌙 Tonight in the {zone}: {desc}.", fr: "🌙 Ce soir dans le {zone} : {desc}." },
  // per-pick rain caveat (rendered on open-air venue cards)
  'weather.rainNowNear':       { en: "🌧️ Raining around {area} right now — covered seating helps.", fr: "🌧️ Il pleut autour de {area} en ce moment — un coin couvert est préférable." },
  'weather.rainSoonNear':      { en: "🌧️ {desc} in {area}'s 2-hour outlook — covered seating helps.", fr: "🌧️ Prévisions 2 h à {area} : {desc} — un coin couvert est préférable." },

  // /carpark
  'carpark.offline':           { en: 'Carpark lookup is offline (LTA key not configured).', fr: 'Recherche de parking hors-ligne (clé LTA non configurée).' },
  'carpark.lookingUp':         { en: '🅿️ Looking up nearest carparks…', fr: '🅿️ Recherche des parkings les plus proches…' },
  'carpark.none':              { en: 'No carparks with available lots near here.', fr: 'Aucun parking avec places disponibles à proximité.' },
  'carpark.header':            { en: '🅿️ Nearest carparks with available lots', fr: '🅿️ Parkings les plus proches avec places disponibles' },
  'carpark.row':               { en: '{i}. {name}  ·  {lots} lots  ·  {dist}', fr: '{i}. {name}  ·  {lots} places  ·  {dist}' },
  'carpark.mapAllCaption':     { en: 'Showing closest locations:', fr: 'Emplacements les plus proches :' },
  'carpark.mapAllBtn':         { en: 'Compare all {n} carparks', fr: 'Comparer les {n} parkings' },
  'carpark.containerCaption':  { en: '🗺 Open all 5 carparks in one Google Maps container:', fr: '🗺 Ouvrir les 5 parkings dans un conteneur Google Maps :' },
  'carpark.viewAllBtn':        { en: '🗺 View all carparks', fr: '🗺 Voir tous les parkings' },
  'carpark.unreachable':       { en: "Sorry, I can't reach the LTA carpark feed right now.", fr: "Désolé, le flux LTA des parkings est inaccessible pour le moment." },

  // /hawker
  'hawker.title':              { en: '🍚 Singapore Hawker Centres & Food Centres (2025). By NEA', fr: '🍚 Centres de hawkers et de restauration de Singapour (2025). Par la NEA' },
  'hawker.openTmaBtn':         { en: '🍚 Open Hawker Centre', fr: '🍚 Ouvrir l’app Hawker' },

  // /transport top menu
  'transport.menu.title':      { en: '🇸🇬 *Transport*', fr: '🇸🇬 *Transports*' },
  'transport.menu.btn.train':       { en: '🚇 Train', fr: '🚇 Métro' },
  'transport.menu.btn.bus':         { en: '🚌 Bus', fr: '🚌 Bus' },
  'transport.menu.btn.incidents':   { en: '🚦 Incidents', fr: '🚦 Incidents' },
  'transport.menu.btn.drive':       { en: '🚗 Drive', fr: '🚗 Voiture' },
  'transport.menu.btn.refreshLoc':  { en: '📍 Refresh location', fr: '📍 Actualiser la position' },

  // /transport bus sub-menu
  'transport.bus.menu.title':       { en: '🚌 Bus Information', fr: '🚌 Informations bus' },
  'transport.bus.menu.btn.nearest': { en: 'Nearest Bus Stops', fr: 'Arrêts de bus proches' },
  'transport.bus.menu.btn.route':   { en: '🗺 Plan a route', fr: '🗺 Planifier un itinéraire' },

  // /transport train view
  'transport.train.heading':        { en: '🚇 Train (MRT)', fr: '🚇 Métro (MRT)' },
  'transport.train.status':         { en: 'Status: {status}', fr: 'État : {status}' },
  'transport.train.notes':          { en: 'Notes: {note}', fr: 'Remarques : {note}' },
  'transport.train.refreshed':      { en: 'Refreshed: {at}', fr: 'Actualisé : {at}' },
  'transport.train.warmup':         { en: 'Status: 🟡 warming up; try again in 30 s.', fr: 'État : 🟡 démarrage en cours ; réessayez dans 30 s.' },
  'transport.train.crowd.l':        { en: '🟢 low', fr: '🟢 faible' },
  'transport.train.crowd.m':        { en: '🟡 medium', fr: '🟡 moyen' },
  'transport.train.crowd.h':        { en: '🔴 high', fr: '🔴 élevé' },
  'transport.train.nearestHeader':  { en: '🚇 Nearest 3 Train stations{wx}', fr: '🚇 3 stations de train les plus proches{wx}' },
  'transport.train.noLocation':     { en: '🚇 Share your location once and Soleat will list the nearest MRT stations too.', fr: '🚇 Partagez votre position une fois et Soleat listera aussi les stations MRT les plus proches.' },
  // v0.60.88 — operator 2026-05-11: invert the message — surface
  // CROWDED counts (medium + high) instead of uncrowded, and name
  // the lines those platforms sit on. `lines` placeholder is filled
  // by index.js from summary.crowdedLines when present.
  'transport.train.network.low':    { en: '🟢 Network is uncrowded — 0 of {total} platforms above low density.',
                                      fr: '🟢 Réseau peu chargé — 0 quai sur {total} au-dessus de la faible densité.' },
  'transport.train.network.medium': { en: '🟡 {medium} moderate · {high} high (of {total}) — Lines: {lines}',
                                      fr: '🟡 {medium} modéré · {high} élevé (sur {total}) — Lignes : {lines}' },
  'transport.train.network.high':   { en: '🔴 {high} high · {medium} moderate (of {total}) — Lines: {lines}',
                                      fr: '🔴 {high} élevé · {medium} modéré (sur {total}) — Lignes : {lines}' },
  'transport.train.affectedLines':  { en: '⚠️ Affected lines:', fr: '⚠️ Lignes affectées :' },
  // v0.60.75 — static MRT network frequency footer (LTA published).
  // Stand-in for per-train arrival times (LTA DataMall doesn't expose
  // them) — gives users a calibration of when to expect the next train.
  // v0.60.88 — operator 2026-05-11: swap 🚇 → ⏱️ since the line is
  // about timing, not trains.
  'transport.train.headway':        { en: '⏱️ Frequency: {peakMin}–{peakMax} min peak · {offMin}–{offMax} min off-peak (LTA published)',
                                      fr: '⏱️ Fréquence : {peakMin}–{peakMax} min en heure de pointe · {offMin}–{offMax} min hors pointe (LTA publié)' },
  // v0.60.97 — operator: spell "d" as "days" / "jours".
  'transport.train.engineering':    { en: '🔧 Upcoming engineering (next 7 days):', fr: '🔧 Travaux à venir (sous 7 jours) :' },
  // v0.60.98 — operator: rename to '🇸🇬 Train Map and Status' so
  // the chat CTA reads as a destination, not an action verb.
  'transport.train.openMapBtn':     { en: '🇸🇬 Train Map and Status', fr: '🇸🇬 Carte et état des trains' },
  'transport.train.unreachable':    { en: "Sorry, I can't reach the MRT feed right now.", fr: "Désolé, le flux MRT est inaccessible pour le moment." },

  // /transport bus
  'transport.bus.noLocation':       { en: '🚌 I need your location first — share it once via the menu (📍) and Soleat will remember.', fr: '🚌 J’ai d’abord besoin de votre position — partagez-la une fois via le menu (📍) et Soleat s’en souviendra.' },
  'transport.bus.offline':          { en: '🚌 Bus lookup is offline (LTA key not configured).', fr: '🚌 Recherche de bus hors-ligne (clé LTA non configurée).' },
  'transport.bus.noStopsNearest':   { en: '🚏 No bus stops within 800 m of your saved location.', fr: '🚏 Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' },
  'transport.bus.nearestHeader':    { en: '🚏 Nearest {count} bus stops', fr: '🚏 {count} arrêts de bus les plus proches' },
  'transport.bus.stopMetaFirst':    { en: '🚏 Bus Stop № {code} is 📍 {dist} away from current location.', fr: '🚏 Arrêt de bus № {code} à 📍 {dist} de votre position actuelle.' },
  'transport.bus.stopMetaRest':     { en: '🚏 Bus Stop № {code} · 📍 {dist}', fr: '🚏 Arrêt de bus № {code} · 📍 {dist}' },
  'transport.bus.stopRow':          { en: '· {desc} ({road}) — {dist}', fr: '· {desc} ({road}) — {dist}' },
  'transport.bus.stopCode':         { en: '  Code: {code}', fr: '  Code : {code}' },
  'transport.bus.noStopsArrivals':  { en: '⏱ No bus stops within 800 m of your saved location.', fr: '⏱ Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' },
  'transport.bus.arrivalsHeader':   { en: '⏱ Next arrivals — top 3 nearest stops', fr: '⏱ Prochains passages — 3 arrêts les plus proches' },
  'transport.bus.noLive':           { en: '  no real-time arrivals', fr: '  aucun passage en temps réel' },
  'transport.bus.noStopsCrowd':     { en: '👥 No bus stops within 800 m to sample.', fr: '👥 Aucun arrêt de bus à moins de 800 m à échantillonner.' },
  'transport.bus.loadHeader':       { en: '👥 Bus load — sampled across nearest 3 stops', fr: '👥 Charge des bus — échantillon des 3 arrêts proches' },
  'transport.bus.load.seats':       { en: 'Seats Available: {n}', fr: 'Places assises : {n}' },
  'transport.bus.load.standing':    { en: 'Standing Available: {n}', fr: 'Places debout : {n}' },
  'transport.bus.load.limited':     { en: 'Limited Standing: {n}', fr: 'Debout limité : {n}' },
  'transport.bus.load.footer':      { en: '(of {n} services with live load data)', fr: '(sur {n} services avec données de charge en direct)' },
  'transport.bus.noLoad':           { en: 'No live load data right now — try again in 30 s.', fr: 'Aucune donnée de charge en direct — réessayez dans 30 s.' },
  'transport.bus.routeCaption':     { en: '🗺 Tap below to open Google Maps in transit mode from your saved location. Type your destination in Maps.', fr: '🗺 Touchez ci-dessous pour ouvrir Google Maps en mode transports depuis votre position enregistrée. Tapez votre destination dans Maps.' },
  'transport.bus.routeBtn':         { en: '🗺 Open Google Maps (transit)', fr: '🗺 Ouvrir Google Maps (transports)' },
  'transport.bus.unreachable':      { en: 'Sorry, the bus feed is unavailable right now.', fr: 'Désolé, le flux des bus est indisponible pour le moment.' },

  // /transport incidents
  'transport.incidents.offline':    { en: '🚦 Traffic feed offline (LTA key not configured).', fr: '🚦 Flux de circulation hors-ligne (clé LTA non configurée).' },
  'transport.incidents.heading':    { en: '🚦 *Live traffic incidents*', fr: '🚦 *Incidents de circulation en direct*' },
  // v0.60.72 — /causeway live SG ⟷ JB border camera stills.
  'transport.causeway.heading':     { en: '🛂 SG ⟷ JB checkpoint cameras', fr: '🛂 Caméras du poste-frontière SG ⟷ JB' },
  'transport.causeway.refreshed':   { en: '_Refreshed: {at}_', fr: '_Actualisé : {at}_' },
  // v0.60.103 — live camera count + per-checkpoint breakdown.
  'transport.causeway.count':       { en: '_{n} cameras live ({breakdown})_', fr: '_{n} caméras en direct ({breakdown})_' },
  'transport.causeway.empty':       { en: 'LTA returned no checkpoint cameras right now — try again in a minute.',
                                      fr: 'LTA n’a renvoyé aucune caméra de poste-frontière — réessayez dans une minute.' },
  'transport.causeway.unreachable': { en: '🛂 Couldn’t reach LTA for checkpoint cameras — try again in a minute.',
                                      fr: '🛂 Impossible de joindre LTA pour les caméras de poste-frontière — réessayez dans une minute.' },
  'transport.incidents.none':       { en: 'No live incidents reported.', fr: 'Aucun incident en direct signalé.' },
  // v0.60.103 — uncapped: show every island-wide incident, sorted
  // nearest-first when location is shared.
  'transport.incidents.nearHeader': { en: 'Latest {n} traffic incidents island-wide:', fr: 'Derniers {n} incidents de circulation à l’échelle de l’île :' },
  'transport.incidents.row':        { en: '· {type}{dist}', fr: '· {type}{dist}' },
  'transport.incidents.noNear':     { en: '{total} incidents island-wide; none within 20 km of your location.', fr: '{total} incidents dans tout le pays ; aucun à moins de 20 km de votre position.' },
  'transport.incidents.noLoc':      { en: '{total} incidents island-wide. Share your location for nearest-first sorting.', fr: '{total} incidents dans tout le pays. Partagez votre position pour un tri par proximité.' },
  'transport.incidents.unreachable':{ en: 'Sorry, the traffic feed failed.', fr: 'Désolé, le flux de circulation a échoué.' },

  // /transport drive
  'transport.drive.title':          { en: '🚗 Drive', fr: '🚗 Voiture' },
  'transport.drive.trafficNear':    { en: '🚦 Traffic (top {n} of {total} island-wide):', fr: '🚦 Circulation (top {n} sur {total} dans tout le pays) :' },
  'transport.drive.trafficNoNear':  { en: '🚦 Traffic: {total} incidents island-wide; none within 5 km.', fr: '🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km.' },
  'transport.drive.trafficNone':    { en: '🚦 Traffic: no live incidents reported.', fr: '🚦 Circulation : aucun incident en direct signalé.' },
  'transport.drive.openMapsBtn':    { en: 'Google Map ↗', fr: 'Google Map ↗' },
  'transport.drive.noLocation':     { en: 'Share your location once and Soleat will offer a one-tap driving directions link.', fr: 'Partagez votre position une fois et Soleat proposera un lien d’itinéraire en voiture en un clic.' },
  'transport.drive.btn.carpark':    { en: '🅿️ Carpark', fr: '🅿️ Parking' },
  'transport.drive.unreachable':    { en: 'Sorry, the drive view failed.', fr: 'Désolé, la vue voiture a échoué.' },

  // /forgetme
  'forgetme.nothing':          { en: '✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.)', fr: '✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.)' },
  'forgetme.eraseHeader':      { en: '✅ Erased *{n}* Redis entry for your chat.', fr: '✅ {n} entrée Redis effacée pour votre conversation.' },
  'forgetme.eraseHeaderMany':  { en: '✅ Erased *{n}* Redis entries for your chat.', fr: '✅ {n} entrées Redis effacées pour votre conversation.' },
  'forgetme.wiped':            { en: 'Wiped:', fr: 'Effacé :' },
  'forgetme.andMore':          { en: '…and {n} more', fr: '…et {n} autres' },
  'forgetme.followup':         { en: 'Send any command to start fresh. Recent picks and your last shared location are gone.', fr: 'Envoyez n’importe quelle commande pour repartir à neuf. Vos choix récents et votre dernière position partagée ont été effacés.' },
  'forgetme.error':            { en: 'Sorry, /forgetme hit an error. Try again in a moment, or DM the operator.', fr: 'Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur.' },

  // /language internal text (cleanup of v0.59.0 hardcoded pairs)
  // v0.62.511 — added native strings for id/ru/de/zh/ja/es so the /language
  // menu renders in the user's own language when they've set a non-EN/FR pref.
  'language.cleared':          { en: '✅ Preference cleared. Soleat will follow your Telegram language.',
                                  fr: '✅ Préférence effacée. Soleat suit désormais la langue de votre Telegram.',
                                  id: '✅ Preferensi dihapus. Soleat akan mengikuti bahasa Telegram Anda.',
                                  ru: '✅ Настройка сброшена. Soleat будет следовать языку вашего Telegram.',
                                  de: '✅ Einstellung zurückgesetzt. Soleat folgt der Telegram-Sprache.',
                                  zh: '✅ 偏好已清除。Soleat 将跟随您的 Telegram 语言。',
                                  ja: '✅ 設定がクリアされました。Soleat はTelegramの言語に従います。',
                                  es: '✅ Preferencia borrada. Soleat seguirá el idioma de tu Telegram.' },
  'language.current':          { en: '🌐 Current language: English{fromTg}.\nChoose a language:',
                                  fr: '🌐 Langue actuelle : Français{fromTg}.\nChoisissez une langue :',
                                  id: '🌐 Bahasa saat ini: Bahasa Indonesia{fromTg}.\nPilih bahasa:',
                                  ru: '🌐 Текущий язык: Русский{fromTg}.\nВыберите язык:',
                                  de: '🌐 Aktuelle Sprache: Deutsch{fromTg}.\nSprache wählen:',
                                  zh: '🌐 当前语言：中文{fromTg}。\n选择语言：',
                                  ja: '🌐 現在の言語：日本語{fromTg}。\n言語を選択：',
                                  es: '🌐 Idioma actual: Español{fromTg}.\nElige un idioma:' },
  'language.fromTg':           { en: ' (from your Telegram)',
                                  fr: ' (depuis votre Telegram)',
                                  id: ' (dari Telegram Anda)',
                                  ru: ' (из вашего Telegram)',
                                  de: ' (von Ihrem Telegram)',
                                  zh: '（来自您的 Telegram）',
                                  ja: '（Telegramより）',
                                  es: ' (de tu Telegram)' },
  'language.btn.en':           { en: '🇬🇧 English', fr: '🇬🇧 English' },
  'language.btn.fr':           { en: '🇫🇷 Français', fr: '🇫🇷 Français' },
  // v0.62.480 — flag + endonym (native name) so a speaker recognises their
  // own language whatever the prompt locale. Same string in both en/fr keys.
  'language.btn.id':           { en: '🇮🇩 Indonesia', fr: '🇮🇩 Indonesia' },
  'language.btn.ru':           { en: '🇷🇺 Русский', fr: '🇷🇺 Русский' },
  'language.btn.de':           { en: '🇩🇪 Deutsch', fr: '🇩🇪 Deutsch' },
  'language.btn.zh':           { en: '🇨🇳 中文', fr: '🇨🇳 中文' },
  'language.btn.ja':           { en: '🇯🇵 日本語', fr: '🇯🇵 日本語' },
  'language.btn.es':           { en: '🇪🇸 Español', fr: '🇪🇸 Español' },

  // /start intro body — v0.60.67: leading paragraph replaced per
  // Human Lead 2026-05-10. Drops the legacy "I'm Gia" framing in
  // favour of a Soleat pitch that names the catalogue depth (50+
  // cuisines, hawkers, Michelin, Bib Gourmand, weather, transport)
  // and closes with /c · /cuisine · /m · /menu CTA.
  // v0.60.72 — /hidden, /ver, and /share removed from the public
  // /start listing per Human Lead 2026-05-10. All three handlers
  // stay live for power users; they just don't surface in the
  // slash-command tour.
  // v0.61.169 — `{cuisines}` / `{hawker}` / `{michelin}` placeholders
  // are substituted at render time via count-display.substituteCounts.
  // Falls back to the v0.61.168 baselines (55 / 100 / 170) when the
  // Periodical count history is unseeded.
  // v0.61.178 — adds {cuisine-venues} placeholder so the intro
  // surfaces the cumulative SG venue count across the 48-cuisine
  // subset (e.g. "over 600+ curated venues"). Replaced by
  // count-display.substituteCounts at /start render time. Falls
  // back to 600+ when the Redis key is empty.
  'start.intro':               { en: "Hungry for something beyond the usual? Soleat — “Solo eats” / “So let’s eat” — helps you explore Singapore’s {cuisines} cuisine melting pot — and other cities — with {cuisine-venues} curated venues, hawkers, Michelin Star picks, Bib Gourmand favourites under S$45, weather, and transport in one Telegram guide. Start with /c /cuisine or /m /menu\n\n/cuisine   — full Cuisine Picker (over {cuisines} cuisines, {cuisine-venues} curated venues, SG, Johor Bahru + other cities, 6 quick filters)\n/hawker    — >{hawker} hawker centres (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table\n/l /location — share or set your current location\n/weather   — now + 2-hour NEA forecast\n/transport — bus, MRT, walk, drive\n/carpark   — nearest 5 with available lots\n/language  — app language · 8 options (chat stays EN/FR)\n/privacy   — data, retention & sources\n/legal     — disclaimer & jurisdiction notes\n/forgetme  — erase your stored data\n\nOr tap the menu button (🍴 Cuisine Picker) to jump straight in.",
                                 fr: "Envie de sortir des plats habituels ? Soleat — « Solo eats » / « So let’s eat » — vous aide à explorer plus de {cuisines} cuisines à Singapour — et d’autres villes — avec {cuisine-venues} adresses sélectionnées, hawkers, adresses Michelin, Bib Gourmand à moins de 45 S$, météo et transport dans Telegram. Commencez avec /c /cuisine ou /m /menu\n\n/cuisine   — Sélecteur Cuisine complet (plus de {cuisines} cuisines, {cuisine-venues} adresses sélectionnées, SG, Johor Bahru + autres villes, 6 filtres rapides)\n/hawker    — plus de {hawker} centres hawkers (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Producteurs locaux\n/l /location — partager ou définir votre position actuelle\n/weather   — maintenant + prévisions 2 h NEA\n/transport — bus, MRT, marche, voiture\n/carpark   — 5 parkings proches avec places\n/language  — langue de l’app · 8 options (chat en FR/EN)\n/privacy   — données, conservation et sources\n/legal     — clauses et juridiction\n/forgetme  — effacer vos données enregistrées\n\nOu touchez le bouton menu (🍴 Sélecteur Cuisine) pour démarrer directement." },

  // location flow
  'location.shareTap':         { en: '📍 Tap to share your current location.', fr: '📍 Touchez pour partager votre position actuelle.' },
  'location.got':              { en: '📍 Got your location.', fr: '📍 Position reçue.' },
  // v0.62.3 — first-share confirmation + desktop nudge. Telegram Desktop has
  // no GPS: its "share" button is a map-pick that defaults to an IP/last point
  // (operator: a first-load share on Mac stuck to "Muzium Negara, KL"). On the
  // FIRST ever share we confirm the resolved place + offer a manual-set path.
  'loc.confirm.firstShare':    { en: '📍 *Location set to:*\n{place}\n\n💻 On desktop, Telegram shares a *map-pinned point*, not live GPS — it can land on the wrong spot. Is this where you are?',
                                 fr: '📍 *Position définie sur :*\n{place}\n\n💻 Sur ordinateur, Telegram partage un *point sur la carte*, pas le GPS — cela peut tomber au mauvais endroit. Est-ce bien là que vous êtes ?' },
  'loc.confirm.yes':           { en: '✅ Yes, use it', fr: '✅ Oui, utiliser' },
  'loc.confirm.no':            { en: '✏️ No, set manually', fr: '✏️ Non, saisir manuellement' },
  'loc.confirm.okAck':         { en: '📍 *Confirmed:* {place}', fr: '📍 *Confirmé :* {place}' },
  'loc.confirm.fixPrompt':     { en: 'Type your area — e.g. `/l Orchard Road` or `/l Bugis`. On desktop, typing is more reliable than the share button.',
                                 fr: 'Saisissez votre lieu — p. ex. `/l Orchard Road` ou `/l Bugis`. Sur ordinateur, taper est plus fiable que le bouton de partage.' },
  'loc.desktopNudge':          { en: '💻 On desktop? Telegram shares a map-pick, not GPS. If this is wrong, type /l <your area>.',
                                 fr: '💻 Sur ordinateur ? Telegram partage un point sur carte, pas le GPS. Si c’est faux, tapez /l <votre lieu>.' },
  // v0.59.6: ensureLocation prompts (the "two messages" /hidden bug).
  'location.shareLabel':       { en: '📍 Share your location once so {label} uses your locale (or type `/location <place name>` to set it manually).',
                                 fr: '📍 Partagez votre position une fois pour que {label} utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).' },
  'location.current':          { en: '📍 Current: {addr}{age}', fr: '📍 Actuel : {addr}{age}' },
  'location.age.justShared':   { en: ' (just shared)', fr: ' (à l’instant)' },
  'location.age.minAgo':       { en: ' ({n} min ago)', fr: ' (il y a {n} min)' },
  'location.age.hourAgo':      { en: ' ({h} h {m} min ago)', fr: ' (il y a {h} h {m} min)' },

  // v0.61.84 — wake-from-idle location re-confirmation prompt. Fired on
  // the first chat message after a long idle gap when a location is
  // still stored; the user keeps it or sets a new one.
  // v0.61.84 — original wake prompt (single message + 2 inline
  // buttons "Stay here" / "New location"). v0.61.140 retires this
  // path for new wake-from-idle events in favour of the 2-step
  // request_location → rich comparison flow below; the strings are
  // retained because old wake messages in chat history still have
  // wake:keep / wake:new callback_data buttons that the callback
  // handler honours for back-compat.
  'wake.locationCheck':        { en: '👋 Welcome back! Soleat is still using the location you shared earlier. Are you still there, or would you like to set a new one?',
                                 fr: '👋 Content de vous revoir ! Soleat utilise toujours la position que vous avez partagée. Y êtes-vous toujours, ou souhaitez-vous en définir une nouvelle ?' },
  'wake.keepBtn':              { en: '✅ Stay here', fr: '✅ Rester ici' },
  'wake.newBtn':               { en: '📍 New location', fr: '📍 Nouvelle position' },
  'wake.kept':                 { en: '👍 Keeping your saved location.', fr: '👍 Position enregistrée conservée.' },
  // v0.61.140 — wake-from-idle 2-step flow (operator rewrite). The
  // wake message asks for a fresh GPS share via request_location;
  // the next bot.on('location') sees the wake:pending flag and runs
  // handleWakeLocationResponse, which sends `wake2.body` (HTML
  // parse_mode) with 3 inline buttons + a /l helper-text line.
  // `wake2.body` substitutes {deviceStreet} (reverse-geocoded from
  // the just-shared GPS) + {anchor} (the v0.61.139 street/building/
  // postal composite, or the legacy curated label).
  'wake.intro':                { en: '👋 Welcome back to Soleat. Share your current location so Soleat can compare with your saved search anchor.',
                                 fr: '👋 Content de vous revoir sur Soleat. Partagez votre position actuelle pour comparer avec votre point de recherche enregistré.' },
  'wake2.body':                { en: '👋 <b>Welcome back to Soleat</b>\n\nYour device now appears to be near: <i>{deviceStreet}</i>\n\nSoleat is still using your saved search anchor:\n<b>{anchor}</b>\n\nContinue searching from the anchor, or update to your current location?\n\n<i>You can also type /l to search from another place, for example:\n/l Orchard Road\n/l IOI City Mall</i>',
                                 fr: '👋 <b>Content de vous revoir sur Soleat</b>\n\nVotre appareil semble être près de : <i>{deviceStreet}</i>\n\nSoleat utilise toujours votre point de recherche enregistré :\n<b>{anchor}</b>\n\nContinuer depuis ce point, ou utiliser votre position actuelle ?\n\n<i>Vous pouvez aussi taper /l pour chercher depuis un autre lieu, par exemple :\n/l Orchard Road\n/l IOI City Mall</i>' },
  'wake2.btnCurrent':          { en: '📍 Use current location', fr: '📍 Position actuelle' },
  'wake2.btnKeep':             { en: '✅ Keep earlier location', fr: '✅ Garder le précédent' },
  'wake2.btnAnother':          { en: '🗺 Set another location', fr: '🗺 Définir un autre lieu' },
  'wake2.currentApplied':      { en: '👍 Anchor updated to <i>{street}</i>.', fr: '👍 Point mis à jour vers <i>{street}</i>.' },
  'wake2.kept':                { en: '👍 Keeping your saved search anchor.', fr: '👍 Point de recherche conservé.' },
  'wake2.anotherHint':         { en: 'Type /l <place> to set a new anchor — for example /l Orchard Road or /l IOI City Mall. Or tap 📍 below to share a fresh GPS location.',
                                 fr: 'Tapez /l <lieu> pour définir un nouveau point — par exemple /l Orchard Road ou /l IOI City Mall. Ou touchez 📍 ci-dessous pour partager une position GPS fraîche.' },
  'wake2.offerExpired':        { en: '⏱ That share expired. Tap /l to set a new anchor.', fr: '⏱ Ce partage a expiré. Tapez /l pour définir un nouveau point.' },

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' },
  'transport.map.incidentsBtn':     { en: 'Show {n} incidents on the Map', fr: 'Afficher {n} incidents sur la carte' },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' },
  // v0.60.61 — relabelled per Human Lead. Standardise on the 🚏
  // bus-stop emoji + drop the literal "on map" suffix (it's
  // implied by the button context).
  'transport.map.busStopsBtn':      { en: 'Show all {n} bus stops', fr: 'Voir les {n} arrêts de bus' },
  'transport.map.stationsCaption':  { en: '🗺 View {n} stations on one map:', fr: '🗺 Voir les {n} stations sur une carte :' },
  // v0.60.98 — operator: show the actual nearest-count instead of
  // "stations on map". Call site (index.js runTransportTrain)
  // interpolates {n} from the slim list length.
  'transport.map.stationsBtn':      { en: 'View {n} Train Stations', fr: 'Voir {n} stations de train' },

  // Distance row addition for MRT stations (was previously bare).
  // v0.60.72 — per-station row carries an HTML <a> wrapping the
  // station name. The link opens Google Maps' transit detail panel
  // (the operator's "incorporate" ask 2026-05-10): tapping it lands
  // on the station's place sheet with live arrival times. The chat
  // send is HTML parse_mode (see runTransportTrain in index.js).
  'transport.train.stationRow':     { en: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>', fr: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>' },

  // v0.59.4 — /hidden chrome localisation.
  'hidden.busy':                  { en: '⏳ Soleat is still working on your last request — hold on a moment.',
                                    fr: '⏳ Soleat traite encore votre dernière demande — un instant.' },
  'hidden.huntingLegacy':         { en: '🎲 Hunting for one hidden gem 1.5–3 km away…',
                                    fr: '🎲 À la recherche d’un trésor caché à 1,5–3 km…' },
  'hidden.legacyNotFound':        { en: "Soleat couldn't find a hidden gem in your annulus. Try moving area or open /cuisine.",
                                    fr: 'Soleat n’a pas trouvé de trésor dans votre zone. Essayez ailleurs ou ouvrez /cuisine.' },
  'hidden.anchorAmbiguous':       { en: "I couldn't pinpoint your area{anchor}. Type the building or area you're at — for example 'Raffles Place MRT Exit A' or 'Holland Village' — and I'll re-anchor /hidden.",
                                    fr: 'Je n’ai pas pu cerner votre zone{anchor}. Tapez le bâtiment ou le quartier où vous êtes — par exemple « Raffles Place MRT Exit A » ou « Holland Village » — et je ré-ancrerai /hidden.' },
  'hidden.anchorAmbiguous.got':   { en: ' (got "{name}")', fr: ' (reçu : « {name} »)' },
  'hidden.searching':             { en: '🔍 Searching hidden gems near {anchor}… please wait.',
                                    fr: '🔍 Recherche de trésors près de {anchor}… veuillez patienter.' },
  'hidden.progress.1':            { en: '⏳ Still searching… cross-referencing recent food blogs and IG posts.',
                                    fr: '⏳ Recherche en cours… recoupement des blogs et posts IG récents.' },
  'hidden.progress.2':            { en: '⏳ Verifying source quality…',
                                    fr: '⏳ Vérification de la qualité des sources…' },
  'hidden.progress.3':            { en: '⏳ Checking opening dates and review counts against Google…',
                                    fr: '⏳ Vérification des dates d’ouverture et du nombre d’avis sur Google…' },
  'hidden.progress.4':            { en: '⏳ Almost there — drafting the picks.',
                                    fr: '⏳ Presque fini — rédaction des choix.' },
  'hidden.progress.5':            { en: "⏳ Hang tight — Gemini is being thorough so the picks aren't fluff.",
                                    fr: '⏳ Patientez — Gemini fait ça soigneusement pour éviter les choix bidons.' },
  'hidden.timeout':               { en: '⏱ /hidden timed out after 4 minutes — Gemini was unresponsive on every fallback model.\n\nThis usually clears in a few minutes. Try again, or check Google AI Studio status if it persists.',
                                    fr: '⏱ /hidden a dépassé le délai de 4 minutes — Gemini n’a pas répondu sur aucun modèle de repli.\n\nCela se résout en général en quelques minutes. Réessayez, ou vérifiez l’état de Google AI Studio si le problème persiste.' },
  'hidden.overload':              { en: '⚠️ Gemini is currently overloaded (503 high demand on every fallback model).\n\nTry /hidden again in a minute or two — your location is still cached so retry will be fast.',
                                    fr: '⚠️ Gemini est actuellement saturé (erreur 503 « high demand » sur tous les modèles de repli).\n\nRéessayez /hidden dans une minute ou deux — votre position est en cache, le réessai sera rapide.' },
  'hidden.outerError':            { en: "Sorry, /hidden hit an unexpected error. The team's been notified — please retry shortly.",
                                    fr: 'Désolé, /hidden a rencontré une erreur inattendue. L’équipe a été notifiée — veuillez réessayer bientôt.' },
  'hidden.allClosed':             { en: 'All picks Gemini found turned out to be temporarily or permanently closed. Try again in a minute — Gemini may surface different gems on retry.',
                                    fr: 'Toutes les trouvailles proposées par Gemini se sont révélées temporairement ou définitivement fermées. Réessayez dans une minute — Gemini peut proposer d’autres trésors.' },
  // v0.61.319 — "Latest review" card line on /hidden rich venue cards.
  'hidden.latestReviewLabel':     { en: '📝 Latest review ·', fr: '📝 Dernier avis ·' },

  // v0.59.4 — single-pick result-card "Nearby carparks" map button.
  'card.carparkMapBtn':           { en: '🅿️ Nearby carparks on map', fr: '🅿️ Parkings proches sur la carte' },

  // v0.59.9 — /privacy rewrite: third-person voice referring to Soleat
  // (the platform), polite tone, softened buddy-ChatID phrasing per
  // Human Lead 2026-05-06. {operator} is the optional OPERATOR_LINKEDIN
  // credit appended by the caller.
  // v0.60.172 — full /privacy body rewrite. Operator supplied the new
  // EN copy verbatim ("Here is a tighter version for /privacy, please
  // replace with text below"). Three-paragraph compact form (was a
  // multi-section bulleted list since v0.60.142). Substance is
  // preserved: 24h location cache, 90d search/usage retention, hashed
  // aggregate counters, no trackers / no marketers / no cross-bot
  // profiles, /forgetme erasure on demand. The bulleted data-source
  // inventory ("Google Places / LTA / NEA / data.gov.sg") is
  // collapsed into "live external data sources, including search and
  // Singapore public data services" — the formal Legal record §3
  // ('legal-0_60_172-…md') remains the source of truth for the
  // technical specifics (Redis keys, hash scheme, exact retention
  // TTLs). Drops the trailing `{operator}` interpolation (mirrors the
  // v0.60.171 /legal change — argument is still passed by
  // runPrivacyCommand but ignored). FR is a fresh translation
  // tracking the EN structure paragraph-for-paragraph (formal "vous"
  // form).
  // v0.61.35 — /privacy body rewrite. Operator supplied the new EN copy
  // ("Reassess this privacy message"); applied verbatim per operator
  // confirmation — the prior 90-day retention disclosure was
  // intentionally dropped (the formal Legal record still documents the
  // TTLs). FR is a fresh paragraph-for-paragraph translation (formal
  // "vous").
  'privacy.body': {
    en: [
      '🔒 *Privacy & Data*',
      '',
      'Soleat only keeps what is needed to run the bot.',
      '',
      'Your location may be remembered for up to 24 hours to help with nearby results. A simple clipboard can hold the places and locations you’ve saved, like a small food-travel journal or scrapbook.',
      '',
      'No personal profile is created. Soleat does not use trackers, sell data, or build cross-bot profiles.',
      '',
      'You can clear your stored data at any time by typing /forgetme.'
    ].join('\n'),
    fr: [
      '🔒 *Confidentialité et données*',
      '',
      'Soleat ne conserve que ce qui est nécessaire au fonctionnement du bot.',
      '',
      'Votre position peut être mémorisée pendant 24 heures maximum afin d’améliorer les résultats à proximité. Un simple presse-papiers peut conserver les lieux et positions que vous avez enregistrés, comme un petit carnet ou album de voyage gastronomique.',
      '',
      'Aucun profil personnel n’est créé. Soleat n’utilise pas de traceurs, ne vend pas de données et ne construit pas de profils inter-bots.',
      '',
      'Vous pouvez effacer vos données enregistrées à tout moment en tapant /forgetme.'
    ].join('\n')
  },
  'privacy.error':                { en: 'Sorry, /privacy hit an error. Please try again in a moment.',
                                    fr: 'Désolé, /privacy a rencontré une erreur. Veuillez réessayer dans un instant.' },

  // v0.60.169 — /legal body migrated from a hard-coded English string
  // in index.js runLegalCommand to a localised i18n key (EN + FR),
  // matching the privacy.body pattern. New clauses added:
  //   1. Google-sourced filter / indicator accuracy disclaimer —
  //      covers the new 🐾 Pet allowed toggle (v0.60.165), the
  //      pre-existing halal / vegetarian / open-now filters, and the
  //      venue ratings + opening hours generally. Operator review:
  //      "As results are determined by Google" — make the disclaimer
  //      explicit for the filters users now make travel decisions on.
  //   2. Geographic-scope note — v0.60.164 widened the JB-region
  //      search from JB-City only to the full state of Johor; users
  //      should know SG-default vs. JB-scope-on-toggle so they
  //      understand cross-border data quality is Google's.
  //
  // v0.60.171 — full body rewrite. Operator supplied the new EN copy
  // verbatim ("Change the text in /legal to this text below"). Adds
  // three new paragraphs vs v0.60.169: transport disclaimer (train /
  // bus / SG-to-MY), takedown contact (LinkedIn), and a fullest-
  // extent-of-law no-liability clause. Drops the trailing
  // "Built by … {operator}" line since the new copy carries the
  // LinkedIn inline in the takedown paragraph (the `{ operator }`
  // interpolation argument still passes through from runLegalCommand
  // but is now an unused placeholder — kept for backward compat with
  // anyone who scripted around the env var). FR is a fresh translation
  // tracking the EN structure paragraph-for-paragraph; chip labels
  // continue to match the existing `filter.*` FR strings.
  // v0.61.35 — /legal body rewrite. Operator supplied the new EN copy
  // ("Reassess … Legal"); applied verbatim per operator confirmation —
  // the prior "IMDA Model AI Governance Framework is followed" line was
  // intentionally dropped. Emoji spacing normalised (one space after
  // each glyph). FR tracks the EN paragraph-for-paragraph.
  'legal.body': {
    en: [
      '🔖 *Legal & Disclaimer*',
      '',
      'Soleat is provided "as is" for general convenience and food discovery. It may use AI, automated tools, Google Places, Singapore public data, and other live sources.',
      '',
      'Information may be inaccurate, delayed, incomplete, or outdated. Please verify directly with venues, especially for 🟢 opening hours, 🕌 halal status, 🥗 vegetarian options, 🐾 pet access, 🏠 home-based listings, transport timing, and travel to Malaysia.',
      '',
      'Soleat mainly covers Singapore. If Johor Bahru is selected, results may include Johor, Malaysia, with data quality depending mainly on available Google Places information.',
      '',
      'Soleat is not professional advice. You are responsible for how you use the results. The builder is not liable for losses, claims, interruptions, or reliance arising from use, to the fullest extent allowed by Singapore law.',
      '',
      'The builder does not intend to infringe any rights. For concerns or takedown requests, kindly contact [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'For data handling, see /privacy.',
      '',
      '2026'
    ].join('\n'),
    fr: [
      '🔖 *Mentions légales et avertissement*',
      '',
      'Soleat est fourni « tel quel » à titre de commodité générale et de découverte gastronomique. Il peut utiliser l’IA, des outils automatisés, Google Places, les données publiques de Singapour et d’autres sources en direct.',
      '',
      'Les informations peuvent être inexactes, retardées, incomplètes ou obsolètes. Veuillez vérifier directement auprès des établissements, en particulier pour 🟢 les horaires d’ouverture, 🕌 le statut halal, 🥗 les options végétariennes, 🐾 l’accès aux animaux, 🏠 les établissements à domicile, les horaires de transport et les déplacements vers la Malaisie.',
      '',
      'Soleat couvre principalement Singapour. Si « Johor Bahru » est sélectionné, les résultats peuvent inclure l’État de Johor, en Malaisie, la qualité des données dépendant principalement des informations disponibles sur Google Places.',
      '',
      'Soleat ne constitue pas un avis professionnel. Vous êtes responsable de l’usage que vous faites des résultats. Le créateur n’est pas responsable des pertes, réclamations, interruptions ou de la confiance accordée découlant de l’utilisation, dans toute la mesure permise par le droit singapourien.',
      '',
      'Le créateur n’a pas l’intention de violer un quelconque droit. Pour toute préoccupation ou demande de retrait, veuillez contacter [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'Pour la gestion des données, voir /privacy.',
      '',
      '2026'
    ].join('\n')
  },
  'legal.error':                  { en: 'Sorry, /legal hit an error. Try again in a moment.',
                                    fr: 'Désolé, /legal a rencontré une erreur. Veuillez réessayer dans un instant.' },

  // v0.59.13 — /recognised localisation
  'recognised.heading':           { en: '🏆 *Singapore — recognised dining*', fr: '🏆 *Singapour — restaurants reconnus*' },
  'recognised.tap':               { en: 'Tap a list to open the source page:', fr: 'Touchez une liste pour ouvrir la page source :' },
  'recognised.btn.bib':           { en: '🍜 MICHELIN Bib Gourmand', fr: '🍜 MICHELIN Bib Gourmand' },
  'recognised.btn.star':          { en: '⭐ MICHELIN Star', fr: '⭐ MICHELIN Étoile' },
  'recognised.btn.asia50':        { en: "🌏 Asia's 50 Best Restaurants", fr: '🌏 Asia\'s 50 Best Restaurants' },
  'recognised.btn.localProduce':  { en: '🌱 Restaurants using Local Produce', fr: '🌱 Restaurants avec produits locaux' },

  // v0.59.13 — /share localisation
  'share.empty':                  { en: 'No recent picks yet. Run /cuisine or /hidden first, then /share to forward to a friend.',
                                    fr: 'Aucun choix récent. Lancez /cuisine ou /hidden d\'abord, puis /share pour partager avec un ami.' },
  'share.prompt':                 { en: 'Pick a venue to forward to your friend ({n} recent):',
                                    fr: 'Choisissez un lieu à partager avec votre ami ({n} récents) :' },
  'share.mintFailed':             { en: "Sorry, I couldn't mint share links right now.",
                                    fr: 'Désolé, impossible de générer les liens de partage pour le moment.' },
  'share.error':                  { en: 'Sorry, /share hit an error.',
                                    fr: 'Désolé, /share a rencontré une erreur.' },

  // v0.59.13 — /buddy localisation
  'buddy.on.body':                { en: '👥 *Buddy mode ON.*\n\nWhen you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. Both of you must confirm before first names + Telegram handles are revealed. Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.\n\n⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._',
                                    fr: '👥 *Mode buddy ACTIVÉ.*\n\nLorsque vous recevez des sélections sanctuaires, un bouton 👥 _Connecter_ apparaît à côté des lieux où un autre utilisateur soleat opté-in se rend dans les 60 prochaines minutes. Vous devez tous deux confirmer avant que les prénoms et identifiants Telegram soient révélés. Limite quotidienne : 5 connexions / 24 h. `/buddy block <chat_id>` pour bloquer. `/buddy report <chat_id> <raison>` pour signaler. `/buddy off` pour désactiver.\n\n⚠ _Pilote — rencontrez uniquement en public, traitez comme un inconnu, faites confiance à votre instinct._' },
  'buddy.off':                    { en: '👥 Buddy mode OFF.', fr: '👥 Mode buddy DÉSACTIVÉ.' },
  'buddy.block.usage':            { en: 'Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer.',
                                    fr: 'Usage : `/buddy block <chat_id>`. Récupérez l\'ID de chat depuis une offre de match précédente.' },
  'buddy.block.ok':               { en: '🚫 Blocked {target}. They will never be matched with you.',
                                    fr: '🚫 {target} bloqué. Vous ne serez plus jamais associé.' },
  'buddy.block.cap':              { en: 'Could not block (max 50 blocks reached).',
                                    fr: 'Impossible de bloquer (limite de 50 atteinte).' },
  'buddy.report.usage':           { en: 'Usage: `/buddy report <chat_id> <reason>`.',
                                    fr: 'Usage : `/buddy report <chat_id> <raison>`.' },
  'buddy.report.ok':              { en: "📝 Report logged. {target} is also auto-blocked from your matches. We'll review.",
                                    fr: '📝 Signalement enregistré. {target} est aussi auto-bloqué de vos matches. Nous examinerons.' },
  'buddy.status':                 { en: '👥 Buddy mode is currently *{state}*. Today\'s connections: {n}/{cap}. Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                                    fr: '👥 Le mode buddy est actuellement *{state}*. Connexions aujourd\'hui : {n}/{cap}. Utilisez `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <raison>`.' },
  'buddy.status.on':              { en: 'ON', fr: 'ACTIVÉ' },
  'buddy.status.off':             { en: 'OFF', fr: 'DÉSACTIVÉ' },
  'buddy.error':                  { en: 'Sorry, /buddy hit an error.', fr: 'Désolé, /buddy a rencontré une erreur.' },

  // v0.59.13 — "Open in Google Maps" buttons added to /carpark,
  // /transport train (nearest stations), /transport bus (nearest stops).
  // Caption + button label for the multi-stop Google Maps directions URL.
  'gmaps.openBtn':                { en: 'Google Map ↗', fr: 'Google Maps ↗' },

  // v0.59.14 — LTA traffic-incident TYPE label translation. Mapped from
  // the verbatim Type field on the LTA TrafficIncidents feed. Message
  // text stays EN (LTA returns free-text descriptions; translating per
  // item would need an LLM and is not worth the cost). Type carries
  // 80% of the user-visible signal.
  // Keys cover both the LTA-documented spellings (per the TrafficIncidents
  // API guide on datamall.lta.gov.sg) AND common variants we've observed
  // in the wild. PascalCase normalisation in translateIncidentType maps
  // the raw feed string to the lookup key. Codex review #218 caught the
  // canonical values "Road Works" → RoadWorks and "Misc." → Misc; both
  // are aliased below alongside the prior shorter forms.
  'incident.type.Accident':            { en: 'Accident', fr: 'Accident' },
  'incident.type.MajorAccident':       { en: 'Major Accident', fr: 'Accident grave' },
  'incident.type.Roadwork':            { en: 'Roadwork', fr: 'Travaux' },
  'incident.type.RoadWorks':           { en: 'Road Works', fr: 'Travaux' },
  'incident.type.VehicleBreakdown':    { en: 'Vehicle Breakdown', fr: 'Véhicule en panne' },
  'incident.type.HeavyTraffic':        { en: 'Heavy Traffic', fr: 'Trafic dense' },
  'incident.type.Misc':                { en: 'Misc.', fr: 'Incident divers' },
  'incident.type.MiscIncident':        { en: 'Miscellaneous', fr: 'Incident divers' },
  'incident.type.Diversion':           { en: 'Diversion', fr: 'Déviation' },
  'incident.type.UnattendedVehicle':   { en: 'Unattended Vehicle', fr: 'Véhicule abandonné' },
  'incident.type.Obstacle':            { en: 'Obstacle', fr: 'Obstacle' },
  'incident.type.RoadBlock':           { en: 'Road Block', fr: 'Route bloquée' },
  'incident.type.MassDisruption':      { en: 'Mass Disruption', fr: 'Perturbation majeure' },
  'incident.type.Weather':             { en: 'Weather', fr: 'Météo' },
  'incident.type.Animals':             { en: 'Animals', fr: 'Animaux' },
  'incident.type.Incident':            { en: 'Incident', fr: 'Incident' },

  // v0.59.17 — /cuisine chat-side strings (the chat reply that opens
  // the cuisine TMA, NOT the TMA itself which has its own i18n). Per
  // Human Lead 2026-05-06: with /language fr or French device locale,
  // the /cuisine chat message + buttons should be French.
  'cuisine.chat.title':           { en: '🍴 Cuisine Picker — Singapore to Johor Bahru',
                                    fr: '🍴 Sélecteur de cuisine — Singapour à Johor Bahru' },
  'cuisine.chat.anchored':        { en: '📍 Anchored to your last shared location.',
                                    fr: '📍 Ancré sur votre dernière position partagée.' },
  // v0.59.22 — both strings trimmed per Human Lead 2026-05-07. The
  // previous wording duplicated "open the picker" / "device GPS"
  // across the two messages (Telegram needs them split because
  // reply-keyboard + inline-keyboard can't share a message). Now
  // each message says one thing once.
  'cuisine.chat.shareForAccurate':{ en: 'For accurate picks, share your location first.',
                                    fr: 'Pour des choix précis, partagez d’abord votre position.' },
  'cuisine.chat.openWithGps':     { en: '↓',
                                    fr: '↓' },
  'cuisine.chat.openBtn':         { en: '🍴 Open Cuisine Picker', fr: '🍴 Ouvrir le sélecteur' },
  'cuisine.chat.shareLocBtn':     { en: '📍 Share location with bot', fr: '📍 Partager la position avec le bot' },
  'cuisine.chat.openError':       { en: "Sorry, I can't open the Cuisine Picker right now.",
                                    fr: 'Désolé, impossible d’ouvrir le sélecteur de cuisine pour le moment.' },
  'cuisine.chat.webhookOnly':     { en: "The Cuisine Picker needs the webhook-mode TMA. Try /hidden for chat-based picks instead, or just type 'find me ramen' / similar and I'll search.",
                                    fr: 'Le Sélecteur de cuisine nécessite la TMA en mode webhook. Essayez /hidden pour des choix en chat, ou tapez « trouve-moi des ramen » / similaire et je cherche.' }
};

// v0.59.14: translate an LTA Type field to the active locale.
// Falls back to the verbatim EN string from the feed when the key is
// not registered (new LTA category not yet mapped). Caller passes the
// raw `inc.type` from transport.fetchTrafficIncidents().
function translateIncidentType(rawType, lang = 'en') {
  if (!rawType) return rawType || '';
  // Normalise the LTA Type field to PascalCase. The feed mixes
  // "Vehicle Breakdown", "Vehicle breakdown", and "VehicleBreakdown" —
  // capitalise after each non-alphanumeric boundary AND the first char.
  const pascal = String(rawType)
    .replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/[^A-Za-z0-9]+$/, '')             // strip trailing non-alphanumeric (e.g. "Misc." → "Misc")
    .replace(/^./, (c) => c.toUpperCase());
  const key = `incident.type.${pascal}`;
  const localised = t(key, lang);
  // t() returns the key itself when missing — fall back to raw EN.
  return localised === key ? rawType : localised;
}

function pickLang(lang) {
  return SUPPORTED.includes(lang) ? lang : 'en';
}

function t(key, lang) {
  const l = pickLang(lang);
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

function tn(key, lang, vars = {}) {
  const raw = t(key, lang);
  return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

module.exports = { t, tn, pickLang, SUPPORTED, translateIncidentType };
