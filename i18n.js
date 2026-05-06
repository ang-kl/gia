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

const SUPPORTED = ['en', 'fr'];

const STRINGS = {
  // Pick-list headers
  'pick.header.one':           { en: '📋 1 place', fr: '📋 1 lieu' },
  'pick.header.many':          { en: '📋 {n} places', fr: '📋 {n} lieux' },
  'pick.results.for':          { en: '🔎 Results for', fr: '🔎 Résultats pour' },

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
  'bot.busy':                  { en: '⏳ Gia is still working on your last request — hold on a moment.',
                                 fr: '⏳ Gia traite encore votre dernière demande — un instant.' },
  'bot.location.prompt':       { en: '📍 Tap to share your current location.',
                                 fr: '📍 Touchez pour partager votre position actuelle.' },
  'bot.location.locale':       { en: '📍 Share your location once so Gia uses your locale (or type `/location <place name>` to set it manually).',
                                 fr: '📍 Partagez votre position une fois pour que Gia utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).' },
  'bot.noresults':             { en: 'No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search.',
                                 fr: 'Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche.' },
  'bot.error.freetext':        { en: 'Sorry, free-text search hit an error. Try /cuisine or /hidden.',
                                 fr: 'Désolé, la recherche libre a rencontré une erreur. Essayez /cuisine ou /hidden.' },
  'bot.location.share':        { en: "📍 Tap to share your location, or type a place name. I'll search after.",
                                 fr: '📍 Touchez pour partager votre position, ou tapez un nom de lieu. Je chercherai ensuite.' },
  'bot.lang.set.en':           { en: '✅ Language set to English.', fr: '✅ Language set to English.' },
  'bot.lang.set.fr':           { en: '✅ Langue réglée sur français.', fr: '✅ Langue réglée sur français.' },

  // v0.59.1 — chat chrome localisation. Covers /weather, /transport (+ all
  // sub-views), /hawker, /carpark, /forgetme, /language, /start intro.
  // Shared button labels (used across multiple surfaces).
  'button.back':               { en: '⬅️ Back', fr: '⬅️ Retour' },
  'button.refresh':            { en: '🔄 Refresh', fr: '🔄 Actualiser' },

  // /weather
  'weather.title':             { en: '☀️ Singapore weather', fr: '☀️ Météo de Singapour' },
  'weather.temp':              { en: 'Temp: {c}°C @ {at}', fr: 'Temp. : {c} °C @ {at}' },
  'weather.humidity':          { en: 'Humidity: {pct}% @ {at}', fr: 'Humidité : {pct} % @ {at}' },
  'weather.rain':              { en: 'Rain: {mm} mm @ {at}', fr: 'Pluie : {mm} mm @ {at}' },
  'weather.wind':              { en: 'Wind: {kt} kt{dir}', fr: 'Vent : {kt} kt{dir}' },
  'weather.forecastNext2h':    { en: 'Next 2h in {area}: {desc}{valid}', fr: 'Prochaines 2 h à {area} : {desc}{valid}' },
  'weather.forecastUntil':     { en: ' (until {time})', fr: ' (jusqu’à {time})' },
  'weather.unreachable':       { en: "Sorry, I can't reach the NEA weather feed right now.", fr: "Désolé, le flux météo NEA est inaccessible pour le moment." },

  // /carpark
  'carpark.offline':           { en: 'Carpark lookup is offline (LTA key not configured).', fr: 'Recherche de parking hors-ligne (clé LTA non configurée).' },
  'carpark.lookingUp':         { en: '🅿️ Looking up nearest carparks…', fr: '🅿️ Recherche des parkings les plus proches…' },
  'carpark.none':              { en: 'No carparks with available lots near here.', fr: 'Aucun parking avec places disponibles à proximité.' },
  'carpark.header':            { en: '🅿️ Nearest carparks with available lots', fr: '🅿️ Parkings les plus proches avec places disponibles' },
  'carpark.row':               { en: '{i}. {name}  ·  {lots} lots  ·  {dist}', fr: '{i}. {name}  ·  {lots} places  ·  {dist}' },
  'carpark.mapAllCaption':     { en: '🗺 View all {n} carparks on one map:', fr: '🗺 Voir les {n} parkings sur une seule carte :' },
  'carpark.mapAllBtn':         { en: '🗺 View all {n} on map', fr: '🗺 Voir les {n} sur la carte' },
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
  'transport.bus.menu.title':       { en: '🚌 Bus — pick what you need', fr: '🚌 Bus — choisissez votre option' },
  'transport.bus.menu.btn.nearest': { en: '🚏 Nearest stops', fr: '🚏 Arrêts proches' },
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
  'transport.train.nearestHeader':  { en: '🚇 Nearest 3 stations · est. wait {min}–{max} min ({label})', fr: '🚇 3 stations les plus proches · attente est. {min}–{max} min ({label})' },
  'transport.train.noLocation':     { en: '🚇 Share your location once and Gia will list the nearest MRT stations too.', fr: '🚇 Partagez votre position une fois et Gia listera aussi les stations MRT les plus proches.' },
  'transport.train.network.low':    { en: '🟢 Network is uncrowded — {pct}% of {total} platforms at low density.', fr: '🟢 Réseau peu chargé — {pct} % des {total} quais à faible densité.' },
  'transport.train.network.medium': { en: '🟡 Network is moderate — {medium} of {total} platforms at medium density, {high} high.', fr: '🟡 Réseau modéré — {medium} sur {total} quais à densité moyenne, {high} élevée.' },
  'transport.train.network.high':   { en: '🔴 Network is busy — {high} of {total} platforms at high density.', fr: '🔴 Réseau chargé — {high} sur {total} quais à forte densité.' },
  'transport.train.affectedLines':  { en: '⚠️ Affected lines:', fr: '⚠️ Lignes affectées :' },
  'transport.train.engineering':    { en: '🔧 Upcoming engineering (next 7 d):', fr: '🔧 Travaux à venir (sous 7 j) :' },
  'transport.train.openMapBtn':     { en: '🗺 Open MRT map', fr: '🗺 Ouvrir la carte MRT' },
  'transport.train.unreachable':    { en: "Sorry, I can't reach the MRT feed right now.", fr: "Désolé, le flux MRT est inaccessible pour le moment." },

  // /transport bus
  'transport.bus.noLocation':       { en: '🚌 I need your location first — share it once via the menu (📍) and Gia will remember.', fr: '🚌 J’ai d’abord besoin de votre position — partagez-la une fois via le menu (📍) et Gia s’en souviendra.' },
  'transport.bus.offline':          { en: '🚌 Bus lookup is offline (LTA key not configured).', fr: '🚌 Recherche de bus hors-ligne (clé LTA non configurée).' },
  'transport.bus.noStopsNearest':   { en: '🚏 No bus stops within 800 m of your saved location.', fr: '🚏 Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' },
  'transport.bus.nearestHeader':    { en: '🚏 Nearest bus stops', fr: '🚏 Arrêts de bus les plus proches' },
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
  'transport.incidents.none':       { en: 'No live incidents reported.', fr: 'Aucun incident en direct signalé.' },
  'transport.incidents.nearHeader': { en: 'Top {n} within 10 km (of {total} island-wide):', fr: 'Top {n} à moins de 10 km (sur {total} dans tout le pays) :' },
  'transport.incidents.row':        { en: '· {type}{dist}', fr: '· {type}{dist}' },
  'transport.incidents.noNear':     { en: '{total} incidents island-wide; none within 10 km of your location.', fr: '{total} incidents dans tout le pays ; aucun à moins de 10 km de votre position.' },
  'transport.incidents.noLoc':      { en: '{total} incidents island-wide. Share your location for nearest-first sorting.', fr: '{total} incidents dans tout le pays. Partagez votre position pour un tri par proximité.' },
  'transport.incidents.unreachable':{ en: 'Sorry, the traffic feed failed.', fr: 'Désolé, le flux de circulation a échoué.' },

  // /transport drive
  'transport.drive.title':          { en: '🚗 Drive', fr: '🚗 Voiture' },
  'transport.drive.trafficNear':    { en: '🚦 Traffic (top {n} of {total} island-wide):', fr: '🚦 Circulation (top {n} sur {total} dans tout le pays) :' },
  'transport.drive.trafficNoNear':  { en: '🚦 Traffic: {total} incidents island-wide; none within 5 km.', fr: '🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km.' },
  'transport.drive.trafficNone':    { en: '🚦 Traffic: no live incidents reported.', fr: '🚦 Circulation : aucun incident en direct signalé.' },
  'transport.drive.openMapsBtn':    { en: '🗺 Open Google Maps (driving)', fr: '🗺 Ouvrir Google Maps (voiture)' },
  'transport.drive.noLocation':     { en: 'Share your location once and Gia will offer a one-tap driving directions link.', fr: 'Partagez votre position une fois et Gia proposera un lien d’itinéraire en voiture en un clic.' },
  'transport.drive.btn.carpark':    { en: '🅿️ Carpark', fr: '🅿️ Parking' },
  'transport.drive.unreachable':    { en: 'Sorry, the drive view failed.', fr: 'Désolé, la vue voiture a échoué.' },

  // /forgetme
  'forgetme.nothing':          { en: '✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.)', fr: '✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.)' },
  'forgetme.eraseHeader':      { en: '✅ Erased *{n}* Redis entry for your chat.', fr: '✅ {n} entrée Redis effacée pour votre conversation.' },
  'forgetme.eraseHeaderMany':  { en: '✅ Erased *{n}* Redis entries for your chat.', fr: '✅ {n} entrées Redis effacées pour votre conversation.' },
  'forgetme.wiped':            { en: 'Wiped:', fr: 'Effacé :' },
  'forgetme.andMore':          { en: '…and {n} more', fr: '…et {n} autres' },
  'forgetme.followup':         { en: 'Send any command to start fresh. /buddy preferences, recent picks, and your last shared location are gone.', fr: 'Envoyez n’importe quelle commande pour repartir à neuf. Vos préférences /buddy, vos choix récents et votre dernière position partagée ont été effacés.' },
  'forgetme.error':            { en: 'Sorry, /forgetme hit an error. Try again in a moment, or DM the operator.', fr: 'Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur.' },

  // /language internal text (cleanup of v0.59.0 hardcoded pairs)
  'language.cleared':          { en: '✅ Preference cleared. Gia will follow your Telegram language.', fr: '✅ Préférence effacée. Gia suit désormais la langue de votre Telegram.' },
  'language.current':          { en: '🌐 Current language: English{fromTg}.\nChoose a language:', fr: '🌐 Langue actuelle : Français{fromTg}.\nChoisissez une langue :' },
  'language.fromTg':           { en: ' (from your Telegram)', fr: ' (depuis votre Telegram)' },
  'language.btn.en':           { en: '🇬🇧 English', fr: '🇬🇧 English' },
  'language.btn.fr':           { en: '🇫🇷 Français', fr: '🇫🇷 Français' },

  // /start intro body
  'start.intro':               { en: "I'm Gia, the concierge inside soleat — your Singapore dining + transport guide.\n\n/cuisine   — full Cuisine Picker (70+ cuisines, SG + Johor Bahru, 6 quick filters)\n/hidden    — up to 5 hidden gems 1.5–3 km away (rarity-ranked)\n/hawker    — >100 hawker centres (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table\n/weather   — now + 2-hour NEA forecast\n/transport — bus, MRT, walk, drive\n/carpark   — nearest 5 with available lots\n/buddy     — live solo-dining match\n/share     — forward a recent pick\n/language  — switch chat language (English / Français)\n/ver       — version + upstream API health\n/privacy   — data, retention & sources\n/legal     — disclaimer & jurisdiction notes\n/forgetme  — erase your stored data\n\nOr tap the menu button (🍴 Cuisine Picker) to jump straight in.",
                                 fr: "Je suis Gia, la conciergerie de soleat — votre guide cuisine et transports à Singapour.\n\n/cuisine   — Sélecteur Cuisine complet (70+ cuisines, SG + Johor Bahru, 6 filtres rapides)\n/hidden    — jusqu’à 5 trouvailles à 1,5–3 km (classées par rareté)\n/hawker    — plus de 100 centres hawkers (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Producteurs locaux\n/weather   — maintenant + prévisions 2 h NEA\n/transport — bus, MRT, marche, voiture\n/carpark   — 5 parkings proches avec places\n/buddy     — match solo en direct\n/share     — partager un choix récent\n/language  — changer la langue (Français / English)\n/ver       — version + santé des API en amont\n/privacy   — données, conservation et sources\n/legal     — clauses et juridiction\n/forgetme  — effacer vos données enregistrées\n\nOu touchez le bouton menu (🍴 Sélecteur Cuisine) pour démarrer directement." },

  // location flow
  'location.shareTap':         { en: '📍 Tap to share your current location.', fr: '📍 Touchez pour partager votre position actuelle.' },
  'location.got':              { en: '📍 Got your location.', fr: '📍 Position reçue.' },
  // v0.59.6: ensureLocation prompts (the "two messages" /hidden bug).
  'location.shareLabel':       { en: '📍 Share your location once so {label} uses your locale (or type `/location <place name>` to set it manually).',
                                 fr: '📍 Partagez votre position une fois pour que {label} utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).' },
  'location.current':          { en: '📍 Current: {addr}{age}', fr: '📍 Actuel : {addr}{age}' },
  'location.age.justShared':   { en: ' (just shared)', fr: ' (à l’instant)' },
  'location.age.minAgo':       { en: ' ({n} min ago)', fr: ' (il y a {n} min)' },
  'location.age.hourAgo':      { en: ' ({h} h {m} min ago)', fr: ' (il y a {h} h {m} min)' },

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' },
  'transport.map.incidentsBtn':     { en: '🗺 View incidents on map', fr: '🗺 Voir les incidents' },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' },
  'transport.map.busStopsBtn':      { en: '🗺 View stops on map', fr: '🗺 Voir les arrêts' },
  'transport.map.stationsCaption':  { en: '🗺 View {n} stations on one map:', fr: '🗺 Voir les {n} stations sur une carte :' },
  'transport.map.stationsBtn':      { en: '🗺 View stations on map', fr: '🗺 Voir les stations' },

  // Distance row addition for MRT stations (was previously bare).
  'transport.train.stationRow':     { en: '· {name} · {dist}{crowd}', fr: '· {name} · {dist}{crowd}' },

  // v0.59.4 — /hidden chrome localisation.
  'hidden.busy':                  { en: '⏳ Gia is still working on your last request — hold on a moment.',
                                    fr: '⏳ Gia traite encore votre dernière demande — un instant.' },
  'hidden.huntingLegacy':         { en: '🎲 Hunting for one hidden gem 1.5–3 km away…',
                                    fr: '🎲 À la recherche d’un trésor caché à 1,5–3 km…' },
  'hidden.legacyNotFound':        { en: "Gia couldn't find a hidden gem in your annulus. Try moving area or open /cuisine.",
                                    fr: 'Gia n’a pas trouvé de trésor dans votre zone. Essayez ailleurs ou ouvrez /cuisine.' },
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

  // v0.59.4 — single-pick result-card "Nearby carparks" map button.
  'card.carparkMapBtn':           { en: '🅿️ Nearby carparks on map', fr: '🅿️ Parkings proches sur la carte' },

  // v0.59.9 — /privacy rewrite: third-person voice referring to Soleat
  // (the platform), polite tone, softened buddy-ChatID phrasing per
  // Human Lead 2026-05-06. {operator} is the optional OPERATOR_LINKEDIN
  // credit appended by the caller.
  'privacy.body': {
    en: [
      '🔒 *Privacy & data handling*',
      '',
      '*What Soleat collects* (only when relevant):',
      '• Location — used when you send a location pin or call /cuisine, /hidden, /carpark, /transport. Cached for up to 24 hours so subsequent commands don\'t have to re-prompt; you can refresh anytime via /transport\'s 📍 Refresh location button, or wipe it immediately via /forgetme.',
      '• Telegram chat identifier — used so Soleat can reply in the right chat. If you opt into /buddy, the same identifier carries your match preferences while you remain opted in.',
      '• Recent picks — the last few venues you saw, kept for /share and /picks. 24-hour TTL.',
      '',
      '*What Soleat does not do:*',
      '• No third-party trackers.',
      '• No sharing with marketers.',
      '• No cross-bot profiling.',
      '',
      '*Live data sources Soleat queries* (no personal data sent):',
      '• Google Places — venue search',
      '• LTA DataMall — transport, traffic, carparks',
      '• NEA — weather',
      '• data.gov.sg — hawker centres, holidays',
      '',
      '*Retention:* stored data expires automatically after 90 days of inactivity. A manual erasure is available at any time — please type /forgetme.{operator}'
    ].join('\n'),
    fr: [
      '🔒 *Confidentialité et gestion des données*',
      '',
      '*Ce que Soleat collecte* (uniquement quand pertinent) :',
      '• Position — utilisée lorsque vous envoyez une épingle ou utilisez /cuisine, /hidden, /carpark, /transport. Conservée jusqu’à 24 heures pour éviter de redemander à chaque commande ; vous pouvez l’actualiser à tout moment via le bouton 📍 Actualiser la position de /transport, ou la supprimer immédiatement via /forgetme.',
      '• Identifiant de chat Telegram — utilisé pour que Soleat puisse répondre dans le bon chat. Si vous activez /buddy, ce même identifiant accompagne vos préférences de match tant que /buddy reste activé.',
      '• Choix récents — les derniers lieux que vous avez vus, conservés pour /share et /picks. TTL de 24 heures.',
      '',
      '*Ce que Soleat ne fait pas :*',
      '• Aucun traceur tiers.',
      '• Aucun partage avec des annonceurs.',
      '• Aucun profilage inter-bots.',
      '',
      '*Sources de données interrogées par Soleat* (aucune donnée personnelle envoyée) :',
      '• Google Places — recherche de lieux',
      '• LTA DataMall — transports, trafic, parkings',
      '• NEA — météo',
      '• data.gov.sg — hawker centres, jours fériés',
      '',
      '*Conservation :* les données expirent automatiquement après 90 jours d’inactivité. Une suppression manuelle est disponible à tout moment — veuillez taper /forgetme.{operator}'
    ].join('\n')
  },
  'privacy.error':                { en: 'Sorry, /privacy hit an error. Please try again in a moment.',
                                    fr: 'Désolé, /privacy a rencontré une erreur. Veuillez réessayer dans un instant.' },

  // v0.59.13 — /recognised localisation
  'recognised.heading':           { en: '🏆 *Singapore — recognised dining*', fr: '🏆 *Singapour — restaurants reconnus*' },
  'recognised.tap':               { en: 'Tap a list to open the source page:', fr: 'Touchez une liste pour ouvrir la page source :' },
  'recognised.btn.bib':           { en: '🍜 MICHELIN Bib Gourmand', fr: '🍜 MICHELIN Bib Gourmand' },
  'recognised.btn.star':          { en: '⭐ MICHELIN Star', fr: '⭐ MICHELIN Étoile' },
  'recognised.btn.asia50':        { en: "🌏 Asia's 50 Best Restaurants", fr: '🌏 Asia\'s 50 Best Restaurants' },
  'recognised.btn.localProduce':  { en: '🌱 Restaurants using Local Produce', fr: '🌱 Restaurants avec produits locaux' },

  // v0.59.13 — /share localisation
  'share.empty':                  { en: 'No recent picks yet. Run /cuisine or /hidden first, then /share to forward to a buddy.',
                                    fr: 'Aucun choix récent. Lancez /cuisine ou /hidden d\'abord, puis /share pour partager avec un ami.' },
  'share.prompt':                 { en: 'Pick a venue to forward to your buddy ({n} recent):',
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
  'gmaps.openBtn':                { en: '🗺 Open in Google Maps', fr: '🗺 Ouvrir dans Google Maps' },

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
  'incident.type.Incident':            { en: 'Incident', fr: 'Incident' }
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
