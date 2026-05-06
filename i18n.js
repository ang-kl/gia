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

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' },
  'transport.map.incidentsBtn':     { en: '🗺 View incidents on map', fr: '🗺 Voir les incidents' },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' },
  'transport.map.busStopsBtn':      { en: '🗺 View stops on map', fr: '🗺 Voir les arrêts' },
  'transport.map.stationsCaption':  { en: '🗺 View {n} stations on one map:', fr: '🗺 Voir les {n} stations sur une carte :' },
  'transport.map.stationsBtn':      { en: '🗺 View stations on map', fr: '🗺 Voir les stations' },

  // Distance row addition for MRT stations (was previously bare).
  'transport.train.stationRow':     { en: '· {name} · {dist}{crowd}', fr: '· {name} · {dist}{crowd}' }
};

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

module.exports = { t, tn, pickLang, SUPPORTED };
