# v0.59.17 — EN/FR string tables (frozen)

Generated from three i18n modules:
- `i18n.js` (server, 195 keys)
- `web/cuisine/src/v2/lib/i18n.js` (cuisine TMA, 63 keys)
- `web/hawker/src/i18n.js` (hawker TMA, 12 keys)

Total unique keys: 270.

Source legend: `s` = server (chat replies, copy-all, venue-templates), `c` = cuisine TMA, `h` = hawker TMA. Combinations like `s+c` mean the same key appears in both.

| Key | Source | EN | FR |
|-----|--------|----|----|
| `banner.anchor` | c | Anchor set | Point d’ancrage défini |
| `banner.locating` | c | Searching nearby | Recherche à proximité |
| `banner.locating.suffix` | c | finding places… | recherche de lieux… |
| `banner.no.match` | c | no places match — try Tell me, or share a fresh pin via /location. | aucun lieu ne correspond — essayez Dis-moi, ou partagez une nouvelle position via /location. |
| `banner.places.many` | c | {n} places nearby | {n} lieux à proximité |
| `banner.places.one` | c | 1 place nearby | 1 lieu à proximité |
| `banner.showing` | c | Showing places | Lieux affichés |
| `bot.busy` | s | ⏳ Gia is still working on your last request — hold on a moment. | ⏳ Gia traite encore votre dernière demande — un instant. |
| `bot.error.freetext` | s | Sorry, free-text search hit an error. Try /cuisine or /hidden. | Désolé, la recherche libre a rencontré une erreur. Essayez /cuisine ou /hidden. |
| `bot.lang.set.en` | s | ✅ Language set to English. | ✅ Language set to English. |
| `bot.lang.set.fr` | s | ✅ Langue réglée sur français. | ✅ Langue réglée sur français. |
| `bot.location.locale` | s | 📍 Share your location once so Gia uses your locale (or type `/location <place name>` to set it manually). | 📍 Partagez votre position une fois pour que Gia utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement). |
| `bot.location.prompt` | s | 📍 Tap to share your current location. | 📍 Touchez pour partager votre position actuelle. |
| `bot.location.share` | s | 📍 Tap to share your location, or type a place name. I'll search after. | 📍 Touchez pour partager votre position, ou tapez un nom de lieu. Je chercherai ensuite. |
| `bot.noresults` | s | No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search. | Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche. |
| `btn.backToTop` | c | Back to top | Retour en haut |
| `btn.clear` | c | Clear | Effacer |
| `btn.collapse` | c | Collapse ▴ | Réduire ▴ |
| `btn.copied` | c | ✓ Copied to chat | ✓ Copié vers le chat |
| `btn.copyAll` | c | 📋 Copy all | 📋 Tout copier |
| `btn.copyOne` | c | 📋 Copy | 📋 Copier |
| `btn.copySyntax` | c | 🔗 Copy /cuisine command | 🔗 Copier la commande /cuisine |
| `btn.editSearch` | c | Edit search ▾ | Modifier la recherche ▾ |
| `btn.maps` | h | 📍 Maps | 📍 Carte |
| `btn.openAllOnGoogleMaps` | h | 🗺 Open all {n} on Google Maps | 🗺 Voir les {n} sur Google Maps |
| `btn.search` | c | 🔍 Search | 🔍 Rechercher |
| `btn.searchFull` | c | 🔍 Search · Show me places to eat | 🔍 Rechercher · Trouvez où manger |
| `btn.searchHere` | c | Search this area | Rechercher dans cette zone |
| `btn.searching` | c | Searching… | Recherche… |
| `btn.showLocation` | c | Show your location | Afficher votre position |
| `buddy.block.cap` | s | Could not block (max 50 blocks reached). | Impossible de bloquer (limite de 50 atteinte). |
| `buddy.block.ok` | s | 🚫 Blocked {target}. They will never be matched with you. | 🚫 {target} bloqué. Vous ne serez plus jamais associé. |
| `buddy.block.usage` | s | Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer. | Usage : `/buddy block <chat_id>`. Récupérez l'ID de chat depuis une offre de match précédente. |
| `buddy.error` | s | Sorry, /buddy hit an error. | Désolé, /buddy a rencontré une erreur. |
| `buddy.off` | s | 👥 Buddy mode OFF. | 👥 Mode buddy DÉSACTIVÉ. |
| `buddy.on.body` | s | 👥 *Buddy mode ON.*  When you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. Both of you must confirm before first names + Telegram handles are revealed. Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.  ⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._ | 👥 *Mode buddy ACTIVÉ.*  Lorsque vous recevez des sélections sanctuaires, un bouton 👥 _Connecter_ apparaît à côté des lieux où un autre utilisateur soleat opté-in se rend dans les 60 prochaines minutes. Vous devez tous deux confirmer avant que les prénoms et identifiants Telegram soient révélés. Limite quotidienne : 5 connexions / 24 h. `/buddy block <chat_id>` pour bloquer. `/buddy report <chat_id> <raison>` pour signaler. `/buddy off` pour désactiver.  ⚠ _Pilote — rencontrez uniquement en public, traitez comme un inconnu, faites confiance à votre instinct._ |
| `buddy.report.ok` | s | 📝 Report logged. {target} is also auto-blocked from your matches. We'll review. | 📝 Signalement enregistré. {target} est aussi auto-bloqué de vos matches. Nous examinerons. |
| `buddy.report.usage` | s | Usage: `/buddy report <chat_id> <reason>`. | Usage : `/buddy report <chat_id> <raison>`. |
| `buddy.status` | s | 👥 Buddy mode is currently *{state}*. Today's connections: {n}/{cap}. Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`. | 👥 Le mode buddy est actuellement *{state}*. Connexions aujourd'hui : {n}/{cap}. Utilisez `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <raison>`. |
| `buddy.status.off` | s | OFF | DÉSACTIVÉ |
| `buddy.status.on` | s | ON | ACTIVÉ |
| `button.back` | s | ⬅️ Back | ⬅️ Retour |
| `button.refresh` | s | 🔄 Refresh | 🔄 Actualiser |
| `card.carparkMapBtn` | s | 🅿️ Nearby carparks on map | 🅿️ Parkings proches sur la carte |
| `card.closed` | c | Closed | Fermé |
| `card.open` | c | Open | Ouvert |
| `carpark.containerCaption` | s | 🗺 Open all 5 carparks in one Google Maps container: | 🗺 Ouvrir les 5 parkings dans un conteneur Google Maps : |
| `carpark.header` | s | 🅿️ Nearest carparks with available lots | 🅿️ Parkings les plus proches avec places disponibles |
| `carpark.lookingUp` | s | 🅿️ Looking up nearest carparks… | 🅿️ Recherche des parkings les plus proches… |
| `carpark.mapAllBtn` | s | 🗺 View all {n} on map | 🗺 Voir les {n} sur la carte |
| `carpark.mapAllCaption` | s | 🗺 View all {n} carparks on one map: | 🗺 Voir les {n} parkings sur une seule carte : |
| `carpark.none` | s | No carparks with available lots near here. | Aucun parking avec places disponibles à proximité. |
| `carpark.offline` | s | Carpark lookup is offline (LTA key not configured). | Recherche de parking hors-ligne (clé LTA non configurée). |
| `carpark.row` | s | {i}. {name}  ·  {lots} lots  ·  {dist} | {i}. {name}  ·  {lots} places  ·  {dist} |
| `carpark.unreachable` | s | Sorry, I can't reach the LTA carpark feed right now. | Désolé, le flux LTA des parkings est inaccessible pour le moment. |
| `carpark.viewAllBtn` | s | 🗺 View all carparks | 🗺 Voir tous les parkings |
| `cat.african` | c | African | Africaine |
| `cat.americas` | c | Americas | Amériques |
| `cat.australasia` | c | Australasia | Australasie |
| `cat.chinaRegional` | c | China (Regional) | Chine (régional) |
| `cat.commonHere` | c | Common in Singapore | Courant à Singapour |
| `cat.eastAsian` | c | East Asian | Asie de l’Est |
| `cat.european` | c | European | Européenne |
| `cat.middleEastern` | c | Middle Eastern & Central Asian | Moyen-Orient & Asie centrale |
| `cat.southAsian` | c | South Asian | Asie du Sud |
| `cat.southeastAsian` | c | Southeast Asian | Asie du Sud-Est |
| `crowd.high` | s | 🔴 busy | 🔴 chargé |
| `crowd.low` | s | 🟢 quiet | 🟢 calme |
| `crowd.medium` | s | 🟡 moderate | 🟡 modéré |
| `cuisine.back` | c | Back | Retour |
| `cuisine.chat.anchored` | s | 📍 Anchored to your last shared location. | 📍 Ancré sur votre dernière position partagée. |
| `cuisine.chat.openBtn` | s | 🍴 Open Cuisine Picker | 🍴 Ouvrir le sélecteur |
| `cuisine.chat.openError` | s | Sorry, I can't open the Cuisine Picker right now. | Désolé, impossible d’ouvrir le sélecteur de cuisine pour le moment. |
| `cuisine.chat.openWithGps` | s | Or open the picker now (it'll try device GPS): | Ou ouvrez le sélecteur maintenant (il essaiera le GPS de l’appareil) : |
| `cuisine.chat.shareForAccurate` | s | For accurate picks, share your location first — or open the picker to use device GPS. | Pour des choix précis, partagez d’abord votre position — ou ouvrez le sélecteur pour utiliser le GPS de l’appareil. |
| `cuisine.chat.shareLocBtn` | s | 📍 Share location with bot | 📍 Partager la position avec le bot |
| `cuisine.chat.title` | s | 🍴 Cuisine Picker — Singapore to Johor Bahru | 🍴 Sélecteur de cuisine — Singapour à Johor Bahru |
| `cuisine.chat.webhookOnly` | s | The Cuisine Picker needs the webhook-mode TMA. Try /hidden for chat-based picks instead, or just type 'find me ramen' / similar and I'll search. | Le Sélecteur de cuisine nécessite la TMA en mode webhook. Essayez /hidden pour des choix en chat, ou tapez « trouve-moi des ramen » / similaire et je cherche. |
| `cuisine.done` | c | Done | Terminé |
| `cuisine.drawerTitle` | c | Cuisines | Cuisines |
| `err.commandFailed` | c | Couldn’t send the command. Try again in a moment. | Impossible d’envoyer la commande. Réessayez dans un instant. |
| `err.copyFailed` | c | Couldn’t send to chat — try again. | Impossible d’envoyer au chat — réessayez. |
| `filter.closeMore` | c | Close more filters | Fermer plus de filtres |
| `filter.closePrice` | c | Close price selector | Fermer le sélecteur de prix |
| `filter.halal` | c | Halal | Halal |
| `filter.homeBased` | c | Home-based | À domicile |
| `filter.newlyOpened` | c | Newly opened | Récemment ouvert |
| `filter.openMore` | c | Open more filters | Ouvrir plus de filtres |
| `filter.openNow` | c | Open now | Ouvert maintenant |
| `filter.openPrice` | c | Open price selector | Ouvrir le sélecteur de prix |
| `filter.price` | c | Price | Prix |
| `filter.vegetarian` | c | Vegetarian | Végétarien |
| `forgetme.andMore` | s | …and {n} more | …et {n} autres |
| `forgetme.eraseHeader` | s | ✅ Erased *{n}* Redis entry for your chat. | ✅ {n} entrée Redis effacée pour votre conversation. |
| `forgetme.eraseHeaderMany` | s | ✅ Erased *{n}* Redis entries for your chat. | ✅ {n} entrées Redis effacées pour votre conversation. |
| `forgetme.error` | s | Sorry, /forgetme hit an error. Try again in a moment, or DM the operator. | Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur. |
| `forgetme.followup` | s | Send any command to start fresh. /buddy preferences, recent picks, and your last shared location are gone. | Envoyez n’importe quelle commande pour repartir à neuf. Vos préférences /buddy, vos choix récents et votre dernière position partagée ont été effacés. |
| `forgetme.nothing` | s | ✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.) | ✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.) |
| `forgetme.wiped` | s | Wiped: | Effacé : |
| `gmaps.openBtn` | s | 🗺 Open in Google Maps | 🗺 Ouvrir dans Google Maps |
| `hawker.openTmaBtn` | s | 🍚 Open Hawker Centre | 🍚 Ouvrir l’app Hawker |
| `hawker.title` | s | 🍚 Singapore Hawker Centres & Food Centres (2025). By NEA | 🍚 Centres de hawkers et de restauration de Singapour (2025). Par la NEA |
| `header.tagline` | c | 💬 Tell me or 🔍 Search | 💬 Dis-moi ou 🔍 Rechercher |
| `header.title` | h | 🍚 Hawker Centre (2025) | 🍚 Centre de hawker (2025) |
| `header.versionCount` | h | v{v} · {n} centres | v{v} · {n} centres |
| `header.versionOnly` | h | v{v} | v{v} |
| `hidden.allClosed` | s | All picks Gemini found turned out to be temporarily or permanently closed. Try again in a minute — Gemini may surface different gems on retry. | Toutes les trouvailles proposées par Gemini se sont révélées temporairement ou définitivement fermées. Réessayez dans une minute — Gemini peut proposer d’autres trésors. |
| `hidden.anchorAmbiguous` | s | I couldn't pinpoint your area{anchor}. Type the building or area you're at — for example 'Raffles Place MRT Exit A' or 'Holland Village' — and I'll re-anchor /hidden. | Je n’ai pas pu cerner votre zone{anchor}. Tapez le bâtiment ou le quartier où vous êtes — par exemple « Raffles Place MRT Exit A » ou « Holland Village » — et je ré-ancrerai /hidden. |
| `hidden.anchorAmbiguous.got` | s |  (got "{name}") |  (reçu : « {name} ») |
| `hidden.busy` | s | ⏳ Gia is still working on your last request — hold on a moment. | ⏳ Gia traite encore votre dernière demande — un instant. |
| `hidden.huntingLegacy` | s | 🎲 Hunting for one hidden gem 1.5–3 km away… | 🎲 À la recherche d’un trésor caché à 1,5–3 km… |
| `hidden.legacyNotFound` | s | Gia couldn't find a hidden gem in your annulus. Try moving area or open /cuisine. | Gia n’a pas trouvé de trésor dans votre zone. Essayez ailleurs ou ouvrez /cuisine. |
| `hidden.outerError` | s | Sorry, /hidden hit an unexpected error. The team's been notified — please retry shortly. | Désolé, /hidden a rencontré une erreur inattendue. L’équipe a été notifiée — veuillez réessayer bientôt. |
| `hidden.overload` | s | ⚠️ Gemini is currently overloaded (503 high demand on every fallback model).  Try /hidden again in a minute or two — your location is still cached so retry will be fast. | ⚠️ Gemini est actuellement saturé (erreur 503 « high demand » sur tous les modèles de repli).  Réessayez /hidden dans une minute ou deux — votre position est en cache, le réessai sera rapide. |
| `hidden.progress.1` | s | ⏳ Still searching… cross-referencing recent food blogs and IG posts. | ⏳ Recherche en cours… recoupement des blogs et posts IG récents. |
| `hidden.progress.2` | s | ⏳ Verifying source quality… | ⏳ Vérification de la qualité des sources… |
| `hidden.progress.3` | s | ⏳ Checking opening dates and review counts against Google… | ⏳ Vérification des dates d’ouverture et du nombre d’avis sur Google… |
| `hidden.progress.4` | s | ⏳ Almost there — drafting the picks. | ⏳ Presque fini — rédaction des choix. |
| `hidden.progress.5` | s | ⏳ Hang tight — Gemini is being thorough so the picks aren't fluff. | ⏳ Patientez — Gemini fait ça soigneusement pour éviter les choix bidons. |
| `hidden.searching` | s | 🔍 Searching hidden gems near {anchor}… please wait. | 🔍 Recherche de trésors près de {anchor}… veuillez patienter. |
| `hidden.timeout` | s | ⏱ /hidden timed out after 4 minutes — Gemini was unresponsive on every fallback model.  This usually clears in a few minutes. Try again, or check Google AI Studio status if it persists. | ⏱ /hidden a dépassé le délai de 4 minutes — Gemini n’a pas répondu sur aucun modèle de repli.  Cela se résout en général en quelques minutes. Réessayez, ou vérifiez l’état de Google AI Studio si le problème persiste. |
| `hours.closed` | s | Closed | Fermé |
| `hours.closedToday` | s | Closed today | Fermé aujourd’hui |
| `hours.openNow` | s | Open now | Ouvert maintenant |
| `hours.opensInDays` | s | Opens in {n} days | Ouvre dans {n} jours |
| `hours.opensTodayAt` | s | Opens today at {time} | Ouvre aujourd’hui à {time} |
| `hours.opensTomorrowAt` | s | Opens tomorrow at {time} | Ouvre demain à {time} |
| `incident.type.Accident` | s | Accident | Accident |
| `incident.type.Animals` | s | Animals | Animaux |
| `incident.type.Diversion` | s | Diversion | Déviation |
| `incident.type.HeavyTraffic` | s | Heavy Traffic | Trafic dense |
| `incident.type.Incident` | s | Incident | Incident |
| `incident.type.MajorAccident` | s | Major Accident | Accident grave |
| `incident.type.MassDisruption` | s | Mass Disruption | Perturbation majeure |
| `incident.type.Misc` | s | Misc. | Incident divers |
| `incident.type.MiscIncident` | s | Miscellaneous | Incident divers |
| `incident.type.Obstacle` | s | Obstacle | Obstacle |
| `incident.type.RoadBlock` | s | Road Block | Route bloquée |
| `incident.type.RoadWorks` | s | Road Works | Travaux |
| `incident.type.Roadwork` | s | Roadwork | Travaux |
| `incident.type.UnattendedVehicle` | s | Unattended Vehicle | Véhicule abandonné |
| `incident.type.VehicleBreakdown` | s | Vehicle Breakdown | Véhicule en panne |
| `incident.type.Weather` | s | Weather | Météo |
| `language.btn.en` | s | 🇬🇧 English | 🇬🇧 English |
| `language.btn.fr` | s | 🇫🇷 Français | 🇫🇷 Français |
| `language.cleared` | s | ✅ Preference cleared. Gia will follow your Telegram language. | ✅ Préférence effacée. Gia suit désormais la langue de votre Telegram. |
| `language.current` | s | 🌐 Current language: English{fromTg}. Choose a language: | 🌐 Langue actuelle : Français{fromTg}. Choisissez une langue : |
| `language.fromTg` | s |  (from your Telegram) |  (depuis votre Telegram) |
| `list.headingBody` | h |  — {n} hawker centres (alphabetical) |  — {n} centres de hawker (alphabétique) |
| `loc.clear` | c | Clear location | Effacer le lieu |
| `loc.enterHint` | c | ↵ Press Enter to use the top result | ↵ Appuyez sur Entrée pour le premier résultat |
| `loc.noMatch` | c | No match — try a more specific name | Aucun résultat — essayez un nom plus précis |
| `loc.searchLocation` | c | Search location | Rechercher un lieu |
| `locale.switchToEn` | c | Switch to English | Passer en anglais |
| `locale.switchToFr` | c | Switch to French | Passer en français |
| `location.age.hourAgo` | s |  ({h} h {m} min ago) |  (il y a {h} h {m} min) |
| `location.age.justShared` | s |  (just shared) |  (à l’instant) |
| `location.age.minAgo` | s |  ({n} min ago) |  (il y a {n} min) |
| `location.current` | s | 📍 Current: {addr}{age} | 📍 Actuel : {addr}{age} |
| `location.got` | s | 📍 Got your location. | 📍 Position reçue. |
| `location.shareLabel` | s | 📍 Share your location once so {label} uses your locale (or type `/location <place name>` to set it manually). | 📍 Partagez votre position une fois pour que {label} utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement). |
| `location.shareTap` | s | 📍 Tap to share your current location. | 📍 Touchez pour partager votre position actuelle. |
| `map.openInMaps` | c | 📍 Open in Google Maps | 📍 Ouvrir dans Google Maps |
| `map.tapPin` | c | Tap pin → Google Maps | Touchez l’épingle → Google Maps |
| `map.youAreHere` | c | You are here | Vous êtes ici |
| `map.yourAnchor` | c | your search anchor | votre point d’ancrage |
| `pick.header.many` | s | 📋 {n} places | 📋 {n} lieux |
| `pick.header.one` | s | 📋 1 place | 📋 1 lieu |
| `pick.results.for` | s | 🔎 Results for | 🔎 Résultats pour |
| `privacy.body` | s | 🔒 *Privacy & data handling*  *What Soleat collects* (only when relevant): • Location — used when you send a location pin or call /cuisine, /hidden, /carpark, /transport. Cached for up to 24 hours so subsequent commands don't have to re-prompt; you can refresh anytime via /transport's 📍 Refresh location button, or wipe it immediately via /forgetme. • Telegram chat identifier — used so Soleat can reply in the right chat. If you opt into /buddy, the same identifier carries your match preferences while you remain opted in. • Recent picks — the last few venues you saw, kept for /share and /picks. 24-hour TTL.  *What Soleat does not do:* • No third-party trackers. • No sharing with marketers. • No cross-bot profiling.  *Live data sources Soleat queries* (no personal data sent): • Google Places — venue search • LTA DataMall — transport, traffic, carparks • NEA — weather • data.gov.sg — hawker centres, holidays  *Retention:* stored data expires automatically after 90 days of inactivity. A manual erasure is available at any time — please type /forgetme.{operator} | 🔒 *Confidentialité et gestion des données*  *Ce que Soleat collecte* (uniquement quand pertinent) : • Position — utilisée lorsque vous envoyez une épingle ou utilisez /cuisine, /hidden, /carpark, /transport. Conservée jusqu’à 24 heures pour éviter de redemander à chaque commande ; vous pouvez l’actualiser à tout moment via le bouton 📍 Actualiser la position de /transport, ou la supprimer immédiatement via /forgetme. • Identifiant de chat Telegram — utilisé pour que Soleat puisse répondre dans le bon chat. Si vous activez /buddy, ce même identifiant accompagne vos préférences de match tant que /buddy reste activé. • Choix récents — les derniers lieux que vous avez vus, conservés pour /share et /picks. TTL de 24 heures.  *Ce que Soleat ne fait pas :* • Aucun traceur tiers. • Aucun partage avec des annonceurs. • Aucun profilage inter-bots.  *Sources de données interrogées par Soleat* (aucune donnée personnelle envoyée) : • Google Places — recherche de lieux • LTA DataMall — transports, trafic, parkings • NEA — météo • data.gov.sg — hawker centres, jours fériés  *Conservation :* les données expirent automatiquement après 90 jours d’inactivité. Une suppression manuelle est disponible à tout moment — veuillez taper /forgetme.{operator} |
| `privacy.error` | s | Sorry, /privacy hit an error. Please try again in a moment. | Désolé, /privacy a rencontré une erreur. Veuillez réessayer dans un instant. |
| `recognised.btn.asia50` | s | 🌏 Asia's 50 Best Restaurants | 🌏 Asia's 50 Best Restaurants |
| `recognised.btn.bib` | s | 🍜 MICHELIN Bib Gourmand | 🍜 MICHELIN Bib Gourmand |
| `recognised.btn.localProduce` | s | 🌱 Restaurants using Local Produce | 🌱 Restaurants avec produits locaux |
| `recognised.btn.star` | s | ⭐ MICHELIN Star | ⭐ MICHELIN Étoile |
| `recognised.heading` | s | 🏆 *Singapore — recognised dining* | 🏆 *Singapour — restaurants reconnus* |
| `recognised.tap` | s | Tap a list to open the source page: | Touchez une liste pour ouvrir la page source : |
| `region.Central` | h | Central | Centre |
| `region.East` | h | East | Est |
| `region.North` | h | North | Nord |
| `region.South` | h | South | Sud |
| `region.West` | h | West | Ouest |
| `region.johor` | c | Johor Bahru | Johor Bahru |
| `region.singapore` | c | Singapore | Singapour |
| `share.empty` | s | No recent picks yet. Run /cuisine or /hidden first, then /share to forward to a buddy. | Aucun choix récent. Lancez /cuisine ou /hidden d'abord, puis /share pour partager avec un ami. |
| `share.error` | s | Sorry, /share hit an error. | Désolé, /share a rencontré une erreur. |
| `share.mintFailed` | s | Sorry, I couldn't mint share links right now. | Désolé, impossible de générer les liens de partage pour le moment. |
| `share.prompt` | s | Pick a venue to forward to your buddy ({n} recent): | Choisissez un lieu à partager avec votre ami ({n} récents) : |
| `start.intro` | s | I'm Gia, the concierge inside soleat — your Singapore dining + transport guide.  /cuisine   — full Cuisine Picker (70+ cuisines, SG + Johor Bahru, 6 quick filters) /hidden    — up to 5 hidden gems 1.5–3 km away (rarity-ranked) /hawker    — >100 hawker centres (2025) /recognised — Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table /weather   — now + 2-hour NEA forecast /transport — bus, MRT, walk, drive /carpark   — nearest 5 with available lots /buddy     — live solo-dining match /share     — forward a recent pick /language  — switch chat language (English / Français) /ver       — version + upstream API health /privacy   — data, retention & sources /legal     — disclaimer & jurisdiction notes /forgetme  — erase your stored data  Or tap the menu button (🍴 Cuisine Picker) to jump straight in. | Je suis Gia, la conciergerie de soleat — votre guide cuisine et transports à Singapour.  /cuisine   — Sélecteur Cuisine complet (70+ cuisines, SG + Johor Bahru, 6 filtres rapides) /hidden    — jusqu’à 5 trouvailles à 1,5–3 km (classées par rareté) /hawker    — plus de 100 centres hawkers (2025) /recognised — Michelin, Bib Gourmand, Asia 50/100, Producteurs locaux /weather   — maintenant + prévisions 2 h NEA /transport — bus, MRT, marche, voiture /carpark   — 5 parkings proches avec places /buddy     — match solo en direct /share     — partager un choix récent /language  — changer la langue (Français / English) /ver       — version + santé des API en amont /privacy   — données, conservation et sources /legal     — clauses et juridiction /forgetme  — effacer vos données enregistrées  Ou touchez le bouton menu (🍴 Sélecteur Cuisine) pour démarrer directement. |
| `status.loading` | h | Loading… | Chargement… |
| `syntax.wrapper` | s | Re-run this search anytime by tapping or pasting: | Relancez cette recherche à tout moment en touchant ou collant : |
| `tellme.aria` | c | Tell me what you’re craving | Dites-moi ce dont vous avez envie |
| `tellme.placeholder` | c | What are you craving? e.g. spicy thai | Quelle est votre envie ? ex. thaï épicé |
| `tellme.submit` | c | Submit | Envoyer |
| `transport.bus.arrivalsHeader` | s | ⏱ Next arrivals — top 3 nearest stops | ⏱ Prochains passages — 3 arrêts les plus proches |
| `transport.bus.load.footer` | s | (of {n} services with live load data) | (sur {n} services avec données de charge en direct) |
| `transport.bus.load.limited` | s | Limited Standing: {n} | Debout limité : {n} |
| `transport.bus.load.seats` | s | Seats Available: {n} | Places assises : {n} |
| `transport.bus.load.standing` | s | Standing Available: {n} | Places debout : {n} |
| `transport.bus.loadHeader` | s | 👥 Bus load — sampled across nearest 3 stops | 👥 Charge des bus — échantillon des 3 arrêts proches |
| `transport.bus.menu.btn.nearest` | s | 🚏 Nearest stops | 🚏 Arrêts proches |
| `transport.bus.menu.btn.route` | s | 🗺 Plan a route | 🗺 Planifier un itinéraire |
| `transport.bus.menu.title` | s | 🚌 Bus — pick what you need | 🚌 Bus — choisissez votre option |
| `transport.bus.nearestHeader` | s | 🚏 Nearest bus stops | 🚏 Arrêts de bus les plus proches |
| `transport.bus.noLive` | s |   no real-time arrivals |   aucun passage en temps réel |
| `transport.bus.noLoad` | s | No live load data right now — try again in 30 s. | Aucune donnée de charge en direct — réessayez dans 30 s. |
| `transport.bus.noLocation` | s | 🚌 I need your location first — share it once via the menu (📍) and Gia will remember. | 🚌 J’ai d’abord besoin de votre position — partagez-la une fois via le menu (📍) et Gia s’en souviendra. |
| `transport.bus.noStopsArrivals` | s | ⏱ No bus stops within 800 m of your saved location. | ⏱ Aucun arrêt de bus à moins de 800 m de votre position enregistrée. |
| `transport.bus.noStopsCrowd` | s | 👥 No bus stops within 800 m to sample. | 👥 Aucun arrêt de bus à moins de 800 m à échantillonner. |
| `transport.bus.noStopsNearest` | s | 🚏 No bus stops within 800 m of your saved location. | 🚏 Aucun arrêt de bus à moins de 800 m de votre position enregistrée. |
| `transport.bus.offline` | s | 🚌 Bus lookup is offline (LTA key not configured). | 🚌 Recherche de bus hors-ligne (clé LTA non configurée). |
| `transport.bus.routeBtn` | s | 🗺 Open Google Maps (transit) | 🗺 Ouvrir Google Maps (transports) |
| `transport.bus.routeCaption` | s | 🗺 Tap below to open Google Maps in transit mode from your saved location. Type your destination in Maps. | 🗺 Touchez ci-dessous pour ouvrir Google Maps en mode transports depuis votre position enregistrée. Tapez votre destination dans Maps. |
| `transport.bus.stopCode` | s |   Code: {code} |   Code : {code} |
| `transport.bus.stopRow` | s | · {desc} ({road}) — {dist} | · {desc} ({road}) — {dist} |
| `transport.bus.unreachable` | s | Sorry, the bus feed is unavailable right now. | Désolé, le flux des bus est indisponible pour le moment. |
| `transport.drive.btn.carpark` | s | 🅿️ Carpark | 🅿️ Parking |
| `transport.drive.noLocation` | s | Share your location once and Gia will offer a one-tap driving directions link. | Partagez votre position une fois et Gia proposera un lien d’itinéraire en voiture en un clic. |
| `transport.drive.openMapsBtn` | s | 🗺 Open Google Maps (driving) | 🗺 Ouvrir Google Maps (voiture) |
| `transport.drive.title` | s | 🚗 Drive | 🚗 Voiture |
| `transport.drive.trafficNear` | s | 🚦 Traffic (top {n} of {total} island-wide): | 🚦 Circulation (top {n} sur {total} dans tout le pays) : |
| `transport.drive.trafficNoNear` | s | 🚦 Traffic: {total} incidents island-wide; none within 5 km. | 🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km. |
| `transport.drive.trafficNone` | s | 🚦 Traffic: no live incidents reported. | 🚦 Circulation : aucun incident en direct signalé. |
| `transport.drive.unreachable` | s | Sorry, the drive view failed. | Désolé, la vue voiture a échoué. |
| `transport.incidents.heading` | s | 🚦 *Live traffic incidents* | 🚦 *Incidents de circulation en direct* |
| `transport.incidents.nearHeader` | s | Top {n} within 10 km (of {total} island-wide): | Top {n} à moins de 10 km (sur {total} dans tout le pays) : |
| `transport.incidents.noLoc` | s | {total} incidents island-wide. Share your location for nearest-first sorting. | {total} incidents dans tout le pays. Partagez votre position pour un tri par proximité. |
| `transport.incidents.noNear` | s | {total} incidents island-wide; none within 10 km of your location. | {total} incidents dans tout le pays ; aucun à moins de 10 km de votre position. |
| `transport.incidents.none` | s | No live incidents reported. | Aucun incident en direct signalé. |
| `transport.incidents.offline` | s | 🚦 Traffic feed offline (LTA key not configured). | 🚦 Flux de circulation hors-ligne (clé LTA non configurée). |
| `transport.incidents.row` | s | · {type}{dist} | · {type}{dist} |
| `transport.incidents.unreachable` | s | Sorry, the traffic feed failed. | Désolé, le flux de circulation a échoué. |
| `transport.map.busStopsBtn` | s | 🗺 View stops on map | 🗺 Voir les arrêts |
| `transport.map.busStopsCaption` | s | 🗺 View {n} bus stops on one map: | 🗺 Voir les {n} arrêts sur une carte : |
| `transport.map.incidentsBtn` | s | 🗺 View incidents on map | 🗺 Voir les incidents |
| `transport.map.incidentsCaption` | s | 🗺 View {n} incidents on one map: | 🗺 Voir les {n} incidents sur une carte : |
| `transport.map.stationsBtn` | s | 🗺 View stations on map | 🗺 Voir les stations |
| `transport.map.stationsCaption` | s | 🗺 View {n} stations on one map: | 🗺 Voir les {n} stations sur une carte : |
| `transport.menu.btn.bus` | s | 🚌 Bus | 🚌 Bus |
| `transport.menu.btn.drive` | s | 🚗 Drive | 🚗 Voiture |
| `transport.menu.btn.incidents` | s | 🚦 Incidents | 🚦 Incidents |
| `transport.menu.btn.refreshLoc` | s | 📍 Refresh location | 📍 Actualiser la position |
| `transport.menu.btn.train` | s | 🚇 Train | 🚇 Métro |
| `transport.menu.title` | s | 🇸🇬 *Transport* | 🇸🇬 *Transports* |
| `transport.train.affectedLines` | s | ⚠️ Affected lines: | ⚠️ Lignes affectées : |
| `transport.train.crowd.h` | s | 🔴 high | 🔴 élevé |
| `transport.train.crowd.l` | s | 🟢 low | 🟢 faible |
| `transport.train.crowd.m` | s | 🟡 medium | 🟡 moyen |
| `transport.train.engineering` | s | 🔧 Upcoming engineering (next 7 d): | 🔧 Travaux à venir (sous 7 j) : |
| `transport.train.heading` | s | 🚇 Train (MRT) | 🚇 Métro (MRT) |
| `transport.train.nearestHeader` | s | 🚇 Nearest 3 stations · est. wait {min}–{max} min ({label}) | 🚇 3 stations les plus proches · attente est. {min}–{max} min ({label}) |
| `transport.train.network.high` | s | 🔴 Network is busy — {high} of {total} platforms at high density. | 🔴 Réseau chargé — {high} sur {total} quais à forte densité. |
| `transport.train.network.low` | s | 🟢 Network is uncrowded — {pct}% of {total} platforms at low density. | 🟢 Réseau peu chargé — {pct} % des {total} quais à faible densité. |
| `transport.train.network.medium` | s | 🟡 Network is moderate — {medium} of {total} platforms at medium density, {high} high. | 🟡 Réseau modéré — {medium} sur {total} quais à densité moyenne, {high} élevée. |
| `transport.train.noLocation` | s | 🚇 Share your location once and Gia will list the nearest MRT stations too. | 🚇 Partagez votre position une fois et Gia listera aussi les stations MRT les plus proches. |
| `transport.train.notes` | s | Notes: {note} | Remarques : {note} |
| `transport.train.openMapBtn` | s | 🗺 Open MRT map | 🗺 Ouvrir la carte MRT |
| `transport.train.refreshed` | s | Refreshed: {at} | Actualisé : {at} |
| `transport.train.stationRow` | s | · {name} · {dist}{crowd} | · {name} · {dist}{crowd} |
| `transport.train.status` | s | Status: {status} | État : {status} |
| `transport.train.unreachable` | s | Sorry, I can't reach the MRT feed right now. | Désolé, le flux MRT est inaccessible pour le moment. |
| `transport.train.warmup` | s | Status: 🟡 warming up; try again in 30 s. | État : 🟡 démarrage en cours ; réessayez dans 30 s. |
| `weather.forecastNext2h` | s | Next 2h in {area}: {desc}{valid} | Prochaines 2 h à {area} : {desc}{valid} |
| `weather.forecastUntil` | s |  (until {time}) |  (jusqu’à {time}) |
| `weather.humidity` | s | Humidity: {pct}% @ {at} | Humidité : {pct} % @ {at} |
| `weather.rain` | s | Rain: {mm} mm @ {at} | Pluie : {mm} mm @ {at} |
| `weather.temp` | s | Temp: {c}°C @ {at} | Temp. : {c} °C @ {at} |
| `weather.title` | s | ☀️ Singapore weather | ☀️ Météo de Singapour |
| `weather.unreachable` | s | Sorry, I can't reach the NEA weather feed right now. | Désolé, le flux météo NEA est inaccessible pour le moment. |
| `weather.wind` | s | Wind: {kt} kt{dir} | Vent : {kt} kt{dir} |
