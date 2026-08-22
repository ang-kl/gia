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
  'pick.header.one':           { en: '📋 1 place', fr: '📋 1 lieu' ,
                      id: '📋 Tempat ke-1',
                      ru: '📋 1 место',
                      de: '📋 1 Platz',
                      zh: '📋 1 个地点',
                      ja: '📋 1件',
                      es: '📋 1 lugar'
                    },
  'pick.header.many':          { en: '📋 {n} places', fr: '📋 {n} lieux' ,
                       id: '📋 {n} tempat',
                       ru: '📋 {n} мест',
                       de: '📋 {n} Orte',
                       zh: '📋 {n}个地方',
                       ja: '📋 {n}箇所',
                       es: '📋 {n} lugares'
                     },
  'pick.results.for':          { en: '🔎 Results for', fr: '🔎 Résultats pour' ,
                       id: '🔎 Hasil untuk',
                       ru: '🔎 Результаты для',
                       de: '🔎 Ergebnisse für',
                       zh: '🔎 结果',
                       ja: '🔎 検索結果',
                       es: '🔎 Resultados para'
                     },
  // v0.60.145 — surfaced when /api/cuisine/copy-all has venues that
  // all lack coordinates (so buildMapHashUrl returns null); the body
  // still sends, just without the inline map button.
  'pick.mapUnavailable':       { en: '📍 Map unavailable for this set.', fr: '📍 Carte indisponible pour cette sélection.' ,
                          id: '📍 Peta tidak tersedia untuk set ini.',
                          ru: '📍 Карта для этого набора недоступна.',
                          de: '📍 Karte für dieses Set nicht verfügbar.',
                          zh: '📍此场景暂无地图。',
                          ja: '📍 このセットには地図がありません。',
                          es: '📍 Mapa no disponible para este conjunto.'
                        },

  // venue-templates.js — formatHoursLine
  'hours.openNow':             { en: 'Open now', fr: 'Ouvert maintenant' ,
                    id: 'Buka sekarang',
                    ru: 'Открыто сейчас',
                    de: 'Jetzt geöffnet',
                    zh: '现在营业',
                    ja: '営業中',
                    es: 'Abierto ahora'
                  },
  'hours.closed':              { en: 'Closed',   fr: 'Fermé' ,
                   id: 'Tertutup',
                   ru: 'Закрыто',
                   de: 'Geschlossen',
                   zh: '关闭',
                   ja: '閉店',
                   es: 'Cerrado'
                 },

  // open-hours.js — closedTodayString
  'hours.closedToday':         { en: 'Closed today',     fr: 'Fermé aujourd’hui' ,
                        id: 'Tutup hari ini',
                        ru: 'Сегодня закрыто',
                        de: 'Heute geschlossen',
                        zh: '今天休息',
                        ja: '本日休業',
                        es: 'Cerrado hoy'
                      },
  'hours.opensTomorrowAt':     { en: 'Opens tomorrow at {time}', fr: 'Ouvre demain à {time}' ,
                            id: 'Buka besok pukul {time}',
                            ru: 'Откроется завтра в {time}',
                            de: 'Öffnet morgen um {time}',
                            zh: '明天{time}开门',
                            ja: '明日{time}にオープンします',
                            es: 'Abre mañana a las {time}'
                          },
  'hours.opensInDays':         { en: 'Opens in {n} days', fr: 'Ouvre dans {n} jours' ,
                        id: 'Buka dalam {n} hari',
                        ru: 'Открытие через {n} дней',
                        de: 'Öffnet in {n} Tagen',
                        zh: '将于{n}天后开业',
                        ja: '{n}日後にオープン',
                        es: 'Abre en {n} días'
                      },
  'hours.opensTodayAt':        { en: 'Opens today at {time}', fr: 'Ouvre aujourd’hui à {time}' ,
                         id: 'Buka hari ini pukul {time}',
                         ru: 'Откроется сегодня в {time}',
                         de: 'Öffnet heute um {time}',
                         zh: '今天{time}开门营业',
                         ja: '本日{time}にオープンします。',
                         es: 'Abre hoy a las {time}'
                       },

  // venue-templates.js — formatStatsLine crowd labels (carry parity with
  // ResultCard so the pasted message + on-screen card match)
  'crowd.high':                { en: '🔴 busy',     fr: '🔴 chargé' ,
                 id: '🔴 sibuk',
                 ru: '🔴 занят',
                 de: '🔴 beschäftigt',
                 zh: '🔴 忙碌',
                 ja: '🔴 忙しい',
                 es: '🔴 ocupado'
               },
  'crowd.medium':              { en: '🟡 moderate', fr: '🟡 modéré' ,
                   id: '🟡 sedang',
                   ru: '🟡 умеренный',
                   de: '🟡 mäßig',
                   zh: '🟡 适中',
                   ja: '🟡 中程度',
                   es: '🟡 moderado'
                 },
  'crowd.low':                 { en: '🟢 quiet',    fr: '🟢 calme' ,
                id: '🟢 tenang',
                ru: '🟢 тихий',
                de: '🟢 ruhig',
                zh: '🟢安静',
                ja: '🟢 静か',
                es: '🟢 silencio'
              },

  // copy-syntax — wrapper line above the /cuisine command
  'syntax.wrapper':            { en: 'Re-run this search anytime by tapping or pasting:', fr: 'Relancez cette recherche à tout moment en touchant ou collant :' ,
                     id: 'Lakukan pencarian ulang kapan saja dengan mengetuk atau menempelkan:',
                     ru: 'Повторить поиск можно в любое время, просто нажав или вставив текст:',
                     de: 'Sie können diese Suche jederzeit durch Antippen oder Einfügen erneut ausführen:',
                     zh: '您可随时点击或粘贴以下命令重新运行此搜索：',
                     ja: 'タップまたは貼り付けることで、いつでもこの検索を再実行できます。',
                     es: 'Vuelva a ejecutar esta búsqueda en cualquier momento tocando o pegando:'
                   },

  // v0.59.0 — bot chrome (most-trafficked chat replies)
  'bot.busy':                  { en: '⏳ Soleat is still working on your last request — hold on a moment.',
                                 fr: '⏳ Soleat traite encore votre dernière demande — un instant.' ,
               id: '⏳ Soleat masih memproses permintaan terakhir Anda — mohon tunggu sebentar.',
               ru: '⏳ Soleat все еще обрабатывает ваш последний запрос — подождите немного.',
               de: '⏳ Soleat arbeitet noch an Ihrer letzten Anfrage – bitte haben Sie einen Moment Geduld.',
               zh: '⏳ Soleat 仍在处理您的最后一个请求——请稍等片刻。',
               ja: '⏳ Soleat は最後のリクエストの処理をまだ行っています。少々お待ちください。',
               es: '⏳ Soleat todavía está trabajando en tu última solicitud; espera un momento.'
             },
  'bot.location.prompt':       { en: '📍 Tap to share your current location.',
                                 fr: '📍 Touchez pour partager votre position actuelle.' ,
                          id: '📍 Ketuk untuk membagikan lokasi Anda saat ini.',
                          ru: '📍 Нажмите, чтобы поделиться своим текущим местоположением.',
                          de: '📍 Tippe hier, um deinen aktuellen Standort zu teilen.',
                          zh: '📍点击分享您的当前位置。',
                          ja: '📍 現在地を共有するにはタップしてください。',
                          es: '📍 Toca para compartir tu ubicación actual.'
                        },
  'bot.location.locale':       { en: '📍 Share your location once so Soleat uses your locale (or type `/location <place name>` to set it manually).',
                          fr: '📍 Partagez votre position une fois pour que Soleat utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).',
                          de: '📍 Teile deinen Standort einmalig, damit Soleat deine Regionseinstellung verwendet (oder gib `/location <place name>` ein, um ihn manuell festzulegen).',
                          zh: '📍 分享一次您的位置，以便 Soleat 使用您的语言环境（或输入 `/location <place name>` 手动设置）。',
                          ja: '📍 一度位置情報を共有すると、Soleat があなたの地域設定を使用します (または、 `/location <place name>` と入力して手動で設定します)。',
                          es: '📍 Comparte tu ubicación una sola vez para que Soleat use tu configuración regional (o escribe `/location <place name>` para configurarla manualmente).' },
  'bot.noresults':             { en: 'No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search.',
                                 fr: 'Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche.' ,
                    id: 'Tidak ada hasil Google Places untuk " {q} " di dekat Anda. Coba /cuisine untuk pemilih makanan, /hidden untuk tempat makan favorit di dekat Anda, atau ubah frasa pencarian Anda.',
                    ru: 'В Google Places нет результатов поиска по запросу " {q} " рядом с вами. Попробуйте использовать /cuisine для выбора заведения, /hidden для поиска интересных мест поблизости или измените формулировку запроса.',
                    de: 'Für " {q} " in deiner Nähe wurden keine Google Places-Ergebnisse gefunden. Versuche es mit /cuisine für die Restaurantauswahl, /hidden für weitere Restaurants in der Nähe oder formuliere deine Suche um.',
                    es: 'No hay resultados de Google Places para " {q} " cerca de ti. Prueba con /cuisine para el selector, /hidden para joyas cercanas o reformula tu búsqueda.'
                  ,
                    zh: '您附近没有与“{q}”相关的 Google Places 结果。请尝试使用 /cuisine 查找附近的景点，或尝试使用 /hidden 查找附近的宝藏，或者重新措辞您的搜索。',
                    ja: '「{q}」で検索しても、お近くのGoogleプレイスの結果は見つかりませんでした。ピッカーで /cuisine 、近くのおすすめスポットで /hidden を試すか、検索語句を変更してください。'
                  },
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
                                 fr: '⇩─ Établissements aux plats ou cuisine similaires ─ ⇩\n⇩─ pas exactement {dish} ─ ⇩' ,
                       id: '⇩─ Tempat makan dengan hidangan atau masakan serupa ─ ⇩\n⇩─ bukan persisnya {dish} ─ ⇩',
                       ru: '⇩─ Заведения общественного питания со схожими блюдами или кухней ─ ⇩\n⇩─ не совсем {dish} ─ ⇩',
                       de: '⇩─ Lokale mit ähnlichen Gerichten oder ähnlicher Küche ─ ⇩\n⇩─ nicht genau {dish} ─ ⇩',
                       zh: '⇩─ 提供类似菜肴或菜系的餐馆 ─ ⇩\n⇩─ 不完全是{dish} ─ ⇩',
                       ja: '⇩─ 似たような料理や料理を提供する飲食店 ─ ⇩\n⇩─ 正確には{dish}ではない ─ ⇩',
                       es: '⇩─ Restaurantes con platos o cocina similares ─ ⇩\n⇩─ no exactamente {dish} ─ ⇩'
                     },
  // v0.60.135 — shown above a free-text / /s dish-search result list
  // when EVERY returned venue is an obvious cuisine mismatch (Google
  // text-matched the words but nothing actually serves the dish).
  'freetext.allBelow':         { en: '⚠️ <i>No Singapore eateries clearly serve {dish} — these just matched your search words:</i>',
                                 fr: '⚠️ <i>Aucun établissement à Singapour ne sert clairement {dish} — voici ceux qui correspondent juste à vos mots-clés :</i>' ,
                        id: '⚠️ <i>Tidak ada tempat makan di Singapura yang secara jelas menyajikan {dish} — ini hanya sesuai dengan kata kunci pencarian Anda:</i>',
                        ru: '⚠️ <i>В Сингапуре нет заведений общественного питания, которые бы явно подавали {dish} — эти заведения просто соответствуют вашим поисковым запросам:</i>',
                        de: '⚠️ <i>Kein Restaurant in Singapur serviert eindeutig {dish} – diese entsprachen lediglich Ihren Suchbegriffen:</i>',
                        zh: '⚠️<i>没有新加坡餐馆明确供应{dish} ——以下这些只是与您的搜索词匹配：</i>',
                        ja: '⚠️<i>シンガポールの飲食店で{dish}を提供しているところは見つかりませんでした。以下は検索語句に一致したものです。</i>',
                        es: '⚠️ <i>Ningún restaurante de Singapur sirve claramente {dish} ; estos coinciden con tus palabras de búsqueda:</i>'
                      },
  // v0.60.128 — "misrepresented dish" note. Surfaced on the free-text
  // dish-search paths (chat + Cuisine TMA "Tell me" box) when the typed
  // term names a dish from data/Misrepresented Dish Dessert Drink.MD.
  // Informational only; the {note} text stays English (source data is
  // English-only). Caller HTML-escapes {name} / {note}.
  'misrep.note':               { en: 'ℹ️ <b>{name}</b> — {note}',
                                 fr: 'ℹ️ <b>{name}</b> — {note}' ,
                  id: 'ℹ️ <b>{name}</b> — {note}',
                  ru: 'ℹ️ <b>{name}</b> — {note}',
                  de: 'ℹ️ <b>{name}</b> — {note}',
                  zh: 'ℹ️ <b>{name}</b> — {note}',
                  ja: 'ℹ️ <b>{name}</b> — {note}',
                  es: 'ℹ️ <b>{name}</b> — {note}'
                },
  // v0.60.129 — "Did you mean a cooking method?" pivot prompt. Fired
  // on the free-text dish-search paths (chat + Cuisine TMA + /s) when
  // the typed term names one or more cooking methods from
  // data/cooking method reference by cuisine.md (+ the baseline
  // cooking-methods.js dict). Source data is English; FR users get a
  // localised framing with English method names.
  'cookmethod.didYouMean':     { en: '🙂 <i>Were you perhaps after a cooking method?</i> Tap a cuisine below, or search literally.',
                                 fr: '🙂 <i>Cherchiez-vous peut-être une méthode de cuisson ?</i> Touchez une cuisine ci-dessous, ou cherchez tel quel.' ,
                            id: '🙂 <i>Apakah Anda mungkin mencari metode memasak? Ketuk masakan di bawah ini, atau cari secara harfiah.</i>',
                            ru: '🙂 <i>Возможно, вас интересовал способ приготовления? Выберите кухню ниже или воспользуйтесь поиском по названию.</i>',
                            de: '🙂 <i>Waren Sie vielleicht auf der Suche nach einer Kochmethode? Tippen Sie unten auf eine Küche oder suchen Sie wörtlich.</i>',
                            zh: '🙂<i>您是不是在寻找某种烹饪方法？点击下方菜系，或直接搜索。</i>',
                            ja: '🙂<i>もしかして、調理方法をお探しですか？下の料理名をタップするか、直接検索してみてください。</i>',
                            es: '🙂 <i>¿Quizás buscabas un método de cocción? Toca una cocina a continuación o realiza una búsqueda.</i>'
                          },
  // v0.60.131 — free-text "looks like a question" decline. Shown when
  // someone types a sentence ("does Beach Road curry rice sell chiffon
  // cake") instead of a dish / cuisine name. Distinct from /s.
  'freetext.questionDeclined': { en: "🍛 Please try a dish name, cooking method, or food term - e.g. Mee Soto, char kway teow, or goulash dumpling",
                                 fr: "🍛 Essayez un nom de plat, une méthode de cuisson ou un terme culinaire - par ex. Mee Soto, char kway teow ou goulash dumpling" ,
                                id: '🍛 Silakan coba sebutkan nama hidangan, metode memasak, atau istilah makanan - misalnya Mee Soto, char kway teow, atau goulash dumpling.',
                                ru: '🍛 Пожалуйста, попробуйте назвать название блюда, способ приготовления или кулинарный термин — например, Mee Soto, char kway teow или goulash dumpling.',
                                de: '🍛 Bitte versuchen Sie es mit einem Gerichtnamen, einer Zubereitungsmethode oder einem Fachbegriff aus der Küche – z. B. Mee Soto, Char Kway Teow oder Gulaschknödel.',
                                zh: '🍛 请尝试提供菜名、烹饪方法或食物相关词汇——例如：面条汤、炒粿条或炖牛肉饺子',
                                ja: '🍛 料理名、調理法、または食品用語を試してみてください。例：ミーソト、チャークイティオ、グーラッシュ餃子',
                                es: '🍛 Por favor, prueba con el nombre de un plato, un método de cocción o un término culinario, por ejemplo: Mee Soto, char kway teow o goulash dumpling.'
                              },
  // v0.60.228 — transport queries (MRT / bus / "how to get to X")
  // aren't food searches; point the user at the /transport tool.
  'freetext.transportRedirect': { en: "🚆 For trains, buses, and getting around Singapore, tap /transport. This chat searches for food and eateries.",
                                 fr: "🚆 Pour les trains, bus et déplacements à Singapour, tapez /transport. Ce chat recherche des plats et des restaurants." },
  'cookmethod.literalBtn':     { en: '🔍 Search literally',
                                 fr: '🔍 Rechercher tel quel' ,
                            id: '🔍 Cari secara harfiah',
                            ru: '🔍 Поиск буквально',
                            de: '🔍 Suche buchstäblich',
                            zh: '🔍 逐字搜索',
                            ja: '🔍文字通り検索',
                            es: '🔍 Buscar literalmente'
                          },
  // v0.61.171 — chat free-text "Search 🔍 for more" follow-up after a
  // free-text search result batch. moreHint: the body line above the
  // inline keyboard when fresh results may remain. moreBtn: the inline
  // button itself. recycleBtn: the "↺" reset button that clears the
  // seen-set and re-runs the same query. noMore: shown when the
  // seen-set is exhausted (either the cap was hit or no fresh results
  // came back). expired: shown if the user taps an old button whose
  // stored query has rolled out of Redis (>30 min TTL).
  'freetext.moreHint':         { en: '💡 Want different picks for the same search?',
                                 fr: '💡 Voulez-vous d\'autres suggestions pour la même recherche ?' ,
                        id: '💡 Ingin pilihan berbeda untuk pencarian yang sama?',
                        ru: '💡 Хотите другие варианты для одного и того же запроса?',
                        de: '💡 Möchten Sie unterschiedliche Ergebnisse für dieselbe Suche?',
                        zh: '💡 想为同一搜索结果选择不同的选项吗？',
                        ja: '💡 同じ検索で別の候補を表示したいですか？',
                        es: '💡 ¿Quieres diferentes opciones para la misma búsqueda?'
                      },
  'freetext.moreBtn':          { en: '🔍 Search for more',
                                 fr: '🔍 Voir d\'autres résultats' ,
                       id: '🔍 Cari selengkapnya',
                       ru: '🔍 Искать больше',
                       de: '🔍 Suche nach mehr',
                       zh: '🔍 搜索更多',
                       ja: '🔍さらに検索する',
                       es: '🔍 Buscar más'
                     },
  'freetext.recycleBtn':       { en: '↺ Start over',
                                 fr: '↺ Recommencer' ,
                          id: '↺ Mulai lagi',
                          ru: '↺ Начать заново',
                          de: '↺ Von vorne beginnen',
                          zh: '↺ 重新开始',
                          ja: '↺ 最初からやり直す',
                          es: '↺ Volver a empezar'
                        },
  'freetext.noMore':           { en: '🔚 No more matching results · Change criteria or tap ↺ to start over.',
                                 fr: '🔚 Plus de résultats correspondants · Modifiez les critères ou touchez ↺ pour recommencer.' ,
                      id: '🔚 Tidak ada lagi hasil yang cocok · Ubah kriteria atau ketuk ↺ untuk memulai dari awal.',
                      ru: '🔚 Результаты поиска больше не найдены · Измените критерии или нажмите ↺, чтобы начать заново.',
                      de: '🔚 Keine weiteren passenden Ergebnisse · Kriterien ändern oder tippen Sie auf ↺, um von vorn zu beginnen.',
                      zh: '🔚 没有更多匹配结果 · 更改条件或点击 ↺ 重新开始。',
                      ja: '🔚 一致する結果はありません · 条件を変更するか、↺ をタップして最初からやり直してください。',
                      es: '🔚 No hay más resultados coincidentes · Cambia los criterios o toca ↺ para empezar de nuevo.'
                    },
  'freetext.expired':          { en: '⌛ That search has expired. Please re-type your query.',
                                 fr: '⌛ Cette recherche a expiré. Veuillez ressaisir votre requête.' ,
                       id: '⌛ Pencarian tersebut telah kedaluwarsa. Silakan ketik ulang kueri Anda.',
                       ru: '⌛ Срок действия этого поиска истек. Пожалуйста, введите запрос заново.',
                       de: '⌛ Diese Suche ist abgelaufen. Bitte geben Sie Ihre Suchanfrage erneut ein.',
                       zh: '⌛ 该搜索已过期。请重新输入您的查询。',
                       ja: '⌛ その検索は期限切れです。もう一度検索語を入力してください。',
                       es: '⌛ Esa búsqueda ha caducado. Por favor, vuelva a escribir su consulta.'
                     },
  // v0.61.122 — /location quick-pick buttons (10 STB precincts + Johor
  // Bahru + IOI Resort City Putrajaya). Header for the inline-keyboard
  // message, plus the confirmation reply that fires from the locpick
  // callback. Cap note is appended when the picked anchor enforces a
  // search-radius ceiling (JB → 30 km, IOI → 15 km).
  // v0.62.85 — operator: simpler prompt. Was "🗺 Quick-pick anchor — tap a
  // precinct or Malaysia city below, or share your live pin above:".
  'loc.precinct.prompt':       { en: '📍 Choose a city below, or saved location',
                                 fr: '📍 Choisissez une ville ci-dessous, ou un lieu enregistré' ,
                          id: '📍 Pilih kota di bawah ini, atau lokasi yang tersimpan',
                          ru: '📍 Выберите город ниже или сохраненное местоположение',
                          de: '📍 Wählen Sie unten eine Stadt oder einen gespeicherten Standort aus.',
                          zh: '📍 请选择下方城市或已保存的位置',
                          ja: '📍 下記の都市、または保存済みの場所を選択してください',
                          es: '📍 Elige una ciudad a continuación o una ubicación guardada.'
                        },
  'loc.set.success':           { en: '📍 Location set to <b>{label}</b>.{cap}',
                                 fr: '📍 Position définie sur <b>{label}</b>.{cap}' ,
                      id: '📍 Lokasi diatur ke <b>{label}</b> . {cap}',
                      ru: '📍 Местоположение установлено на <b>{label}</b> . {cap}',
                      de: '📍 Standort eingestellt auf <b>{label}</b> . {cap}',
                      zh: '📍 位置已设置<b>{label}</b> . {cap}',
                      ja: '📍 場所設定<b>{label}</b> . {cap}',
                      es: '📍 Ubicación establecida en <b>{label}</b> . {cap}'
                    },
  // v0.61.412 — operator: when the user PICKS a new search area in a TMA and
  // returns to chat, confirm it. Fires only on a deliberate pick AND an actual
  // area change (never on app-open / auto-detect). {label} is HTML-escaped.
  'loc.searchArea.set':        { en: '📍 Area set: {area}\n\nUse <code>/location</code> or <code>/l &lt;place&gt;</code> · change address',
                                 fr: '📍 Zone définie : {area}\n\nUtilisez <code>/location</code> ou <code>/l &lt;lieu&gt;</code> · changer d’adresse' ,
                         id: '📍 Area set: {area}\n\nGunakan <code>/location</code> atau <code>/l &lt;place&gt;</code> · ubah alamat',
                         ru: '📍 Площадь: {area}\n\nИспользуйте <code>/location</code> или <code>/l &lt;place&gt;</code> · изменить адрес',
                         de: '📍 Bereichseinstellung: {area}\n\nVerwenden Sie <code>/location</code> oder <code>/l &lt;place&gt;</code> · Adresse ändern',
                         zh: '📍 区域设置： {area}\n\n使用 <code>/location</code> 或 <code>/l &lt;place&gt;</code> · 更改地址',
                         ja: '📍 エリア設定: {area}\n\n <code>/location</code> または <code>/l &lt;place&gt;</code> を使用して住所を変更します',
                         es: '📍 Área configurada: {area}\n\nUtilice <code>/location</code> o <code>/l &lt;place&gt;</code> · cambiar dirección'
                       },
  'loc.set.capNote':           { en: ' Searches anchored here are capped to {km} km.',
                                 fr: ' Les recherches sont limitées à {km} km autour de ce point.' ,
                      id: 'Pencarian yang berpusat di sini dibatasi hingga {km} km.',
                      ru: 'Поиск, привязанный к этому месту, ограничен диапазоном {km} км.',
                      de: 'Hier verankerte Suchanfragen sind auf {km} km begrenzt.',
                      zh: '此处的搜索范围上限为{km}公里。',
                      ja: 'ここを基準とした検索範囲は{km} kmに制限されます。',
                      es: 'Las búsquedas ancladas aquí están limitadas a {km} km.'
                    },
  'loc.set.unknown':           { en: "⚠️ I don't recognise that quick-pick. Tap one of the buttons or share a pin.",
                                 fr: "⚠️ Je ne reconnais pas cette sélection. Touchez l'un des boutons ou partagez une position." ,
                      id: '⚠️ Saya tidak mengenali pilihan cepat itu. Ketuk salah satu tombol atau bagikan PIN.',
                      ru: '⚠️ Я не узнаю этот быстрый выбор. Нажмите одну из кнопок или поделитесь пин-кодом.',
                      de: '⚠️ Diese Schnellauswahl ist mir unbekannt. Tippe auf eine der Schaltflächen oder teile einen Pin.',
                      zh: '⚠️ 我不认识这个快捷选择。请点击其中一个按钮或分享一个图钉。',
                      ja: '⚠️ このクイックピックは認識できません。いずれかのボタンをタップするか、ピンを共有してください。',
                      es: '⚠️ No reconozco esa selección rápida. Toca uno de los botones o comparte un pin.'
                    },
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
                                 fr: '<i>Voulez-vous voir les établissements à <b>{place}</b> ?</i>' ,
                            id: '<i>Ingin melihat tempat makan di <b>{place}</b> ?</i>',
                            ru: '<i>Хотите посмотреть заведения общественного питания в <b>{place}</b> ?</i>',
                            de: '<i>Möchten Sie Restaurants sehen bei <b>{place}</b> ?</i>',
                            zh: '<i>想看看附近的餐馆<b>{place}</b> ？</i>',
                            ja: '<i>飲食店を見たい<b>{place}</b> ？</i>',
                            es: '<i>¿Quieres ver restaurantes en <b>{place}</b> ?</i>'
                          },
  'loc.searchPick.btn':        { en: '🔍 See eateries here',
                                 fr: '🔍 Voir les établissements ici' ,
                         id: '🔍 Lihat tempat makan di sini',
                         ru: '🔍 Список заведений общественного питания здесь',
                         de: '🔍 Restaurants und Cafés finden Sie hier',
                         zh: '🔍 点击此处查看餐厅',
                         ja: '🔍 飲食店一覧はこちら',
                         es: '🔍 Vea los restaurantes aquí'
                       },
  // v0.61.119 — place-anchored search (hawker centre / MRT / mall /
  // building / address typed in chat free-text). Header above the
  // venue list, the button that fans out to better-rated nearby
  // eateries, and the header above that nearby list.
  'place.foundN':              { en: '📍 <b>{place}</b> — found {n} eateries here',
                                 fr: '📍 <b>{place}</b> — {n} établissements trouvés ici' ,
                   id: '📍 <b>{place}</b> — menemukan {n} tempat makan di sini',
                   ru: '📍 <b>{place}</b> — здесь найдено {n} заведений общественного питания',
                   de: '📍 <b>{place}</b> — hier wurden {n} Restaurants gefunden',
                   zh: '📍 <b>{place}</b> — 在这里找到了{n}家餐馆',
                   ja: '📍 <b>{place}</b> — ここで{n}軒の飲食店が見つかりました',
                   es: '📍 <b>{place}</b> — se encontraron {n} restaurantes aquí'
                 },
  // v0.61.124 — "showing {shown} of {total}" format requested by the
  // operator: when the place has more eateries than fit in one reply
  // (cap 12), surface the ratio so the user knows there are more.
  'place.foundShownOfTotal':   { en: '📍 <b>{place}</b> — showing {shown} of {total} eateries here',
                                 fr: '📍 <b>{place}</b> — {shown} sur {total} établissements ici' ,
                              id: '📍 <b>{place}</b> — menampilkan {shown} dari {total} tempat makan di sini',
                              ru: '📍 <b>{place}</b> — показано {shown} из {total} заведений общественного питания здесь',
                              de: '📍 <b>{place}</b> — zeigt {shown} von {total} Restaurants hier an',
                              zh: '📍 <b>{place}</b> — 此处显示{shown}家餐厅， {total}家。',
                              ja: '📍 <b>{place}</b> — ここには{shown}軒の飲食店{total}軒）が表示されています',
                              es: '📍 <b>{place}</b> — mostrando {shown} de {total} restaurantes aquí'
                            },
  // v0.61.124 — auto-suggest intro when the place itself is weak
  // (< 5 eateries OR average rating < 4.0). Sent ahead of the
  // automatic nearby fan-out so the user understands why we're
  // showing extras without them tapping the button.
  'place.autoNearbyIntro':     { en: '_Slim pickings at <b>{place}</b> — here are the top-rated eateries nearby:_',
                                 fr: '_Peu d’options à <b>{place}</b> — voici les mieux notés à proximité :_' ,
                            id: 'Pilihan yang terbatas di <b>{place}</b> — berikut adalah tempat makan dengan peringkat teratas di dekatnya:_',
                            ru: 'Выбор невелик. <b>{place}</b> — вот лучшие рестораны поблизости:',
                            de: '_Magere Auswahl bei <b>{place}</b> — hier sind die bestbewerteten Restaurants in der Nähe:_',
                            zh: '_选择寥寥无几<b>{place}</b> — 以下是附近评分最高的餐厅：',
                            ja: '_選択肢が少ない<b>{place}</b> — 近隣のおすすめ飲食店はこちらです:_',
                            es: '_Escasas opciones en <b>{place}</b> — aquí están los restaurantes mejor valorados de la zona:'
                          },
  // v0.61.124 — "outside the zone" header for precinct anchors
  // (Marina Bay, Chinatown, etc.) where the polygon exclusion filters
  // out venues inside the precinct itself.
  'place.outsideHeader':       { en: '✨ <b>Top {n} eateries outside {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements hors de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' ,
                          id: '✨ <b>Restoran terbaik {n} di luar {place} (dalam radius {km} km, diurutkan berdasarkan peringkat · Michelin · kelangkaan · keramaian)</b>',
                          ru: '✨ <b>Лучшие {n} заведения общественного питания за пределами {place} (в пределах {km} км, ранжированные по рейтингу · Michelin · редкости · количеству посетителей)</b>',
                          de: '✨ <b>Top {n} Restaurants außerhalb von {place} (im Umkreis von {km} km, sortiert nach Bewertung · Michelin · Seltenheit · Besucheraufkommen)</b>',
                          zh: '✨<b>在{place}以外{km}公里范围内，按评分、米其林星级、稀有度、客流量排名的{n}家顶级餐厅</b>',
                          ja: '✨ <b>{place}周辺（ {km} km以内）のおすすめ飲食店トップ{n}軒（評価・ミシュラン・希少性・混雑度順）</b>',
                          es: '✨ <b>Los mejores restaurantes fuera de {place} {n} en un radio de {km} km, clasificados por puntuación · Michelin · rareza · clientela)</b>'
                        },
  'place.outsideEmpty':        { en: '🤷 No standout eateries outside {place} (within {km} km) right now.',
                                 fr: '🤷 Aucun établissement marquant hors de {place} (dans un rayon de {km} km) en ce moment.' ,
                         id: '🤷 Tidak ada tempat makan unggulan di luar {place} (dalam radius {km} km) saat ini.',
                         ru: '🤷 В настоящее время за пределами {place} (в пределах {km} км) нет выдающихся заведений общественного питания.',
                         de: '🤷 Derzeit gibt es außerhalb von {place} (im Umkreis von {km} km) keine herausragenden Restaurants.',
                         zh: '🤷 目前在{place}以外（ {km}公里范围内）没有特别出色的餐馆。',
                         ja: '🤷 現在、 {place}周辺 ( {km} km 以内) には特におすすめの飲食店はありません。',
                         es: '🤷 No hay restaurantes destacados fuera de {place} (dentro de {km} km) en este momento.'
                       },
  'place.foundEmpty':          { en: "📍 <b>{place}</b> — couldn't find eateries here. Showing top-rated nearby instead.",
                                 fr: "📍 <b>{place}</b> — aucun établissement ici. Voici les mieux notés à proximité." ,
                       id: '📍 <b>{place}</b> — tidak ditemukan tempat makan di sini. Sebagai gantinya, menampilkan tempat makan dengan peringkat teratas di dekatnya.',
                       ru: '📍 <b>{place}</b> — не удалось найти здесь заведения общественного питания. Вместо этого отображаются лучшие заведения поблизости.',
                       de: '📍 <b>{place}</b> – Hier konnten keine Restaurants gefunden werden. Stattdessen werden die am besten bewerteten Restaurants in der Nähe angezeigt.',
                       zh: '📍 <b>{place}</b> — 此处未找到餐厅。显示附近评分最高的餐厅。',
                       ja: '📍 <b>{place}</b> — このエリアには飲食店が見つかりませんでした。代わりに、近隣の高評価の飲食店を表示します。',
                       es: '📍 <b>{place}</b> — No se encontraron restaurantes aquí. En su lugar, se muestran los mejor valorados en las cercanías.'
                     },
  'place.nearbyBtn':           { en: '✨ Top eateries nearby',
                                 fr: '✨ Meilleurs établissements à proximité' ,
                      id: '✨ Restoran-restoran terbaik di sekitar sini',
                      ru: '✨ Лучшие рестораны поблизости',
                      de: '✨ Top-Restaurants in der Nähe',
                      zh: '✨附近热门餐厅',
                      ja: '✨ 近隣の人気飲食店',
                      es: '✨ Los mejores restaurantes cercanos'
                    },
  'place.nearbyHeader':        { en: '✨ <b>Top {n} eateries near {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements près de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' ,
                         id: '✨ <b>Restoran terbaik {n} di dekat {place} (dalam radius {km} km, diurutkan berdasarkan peringkat · Michelin · kelangkaan · keramaian)</b>',
                         ru: '✨ <b>Лучшие {n} рестораны рядом с {place} (в пределах {km} км, ранжированные по рейтингу · Michelin · редкости · количеству посетителей)</b>',
                         de: '✨ <b>Top {n} Restaurants in der Nähe von {place} (im Umkreis von {km} km, sortiert nach Bewertung · Michelin · Seltenheit · Publikumsandrang)</b>',
                         zh: '✨<b>距离{place}地点{km}公里内，按评分、米其林星级、稀有度、客流量排名的{n}家顶级餐厅</b>',
                         ja: '✨ <b>{place}周辺のおすすめ飲食店{n}軒（ {km} km以内、評価順・ミシュラン評価順・希少性順・混雑順）</b>',
                         es: '✨ <b>Los mejores restaurantes cerca de {place} {n} en un radio de {km} km, clasificados por puntuación · Michelin · rareza · clientela)</b>'
                       },
  'place.nearbyEmpty':         { en: '🤷 No standout eateries within {km} km of {place} right now.',
                                 fr: '🤷 Aucun établissement marquant dans un rayon de {km} km de {place} en ce moment.' ,
                        id: '🤷 Tidak ada tempat makan unggulan dalam radius {km} km dari {place} saat ini.',
                        ru: '🤷 В радиусе {km} км от {place} в данный момент нет выдающихся заведений общественного питания.',
                        de: '🤷 Derzeit gibt es im Umkreis von {km} km um {place} keine herausragenden Restaurants.',
                        zh: '🤷 目前在{place}附近{km}公里范围内没有特别出色的餐馆。',
                        ja: '🤷 現在{place}から{km} km以内に特におすすめの飲食店はありません。',
                        es: '🤷 No hay restaurantes destacados en un radio de {km} km de {place} en este momento.'
                      },
  'place.expired':             { en: '⏱ That suggestion expired. Type the place name again to refresh.',
                                 fr: '⏱ Cette suggestion a expiré. Tapez à nouveau le nom du lieu pour actualiser.' ,
                    id: '⏱ Saran tersebut telah kedaluwarsa. Ketik nama tempat lagi untuk menyegarkan halaman.',
                    ru: '⏱ Это предложение устарело. Введите название места еще раз для обновления.',
                    de: '⏱ Dieser Vorschlag ist abgelaufen. Geben Sie den Ortsnamen erneut ein, um die Liste zu aktualisieren.',
                    zh: '⏱ 该建议已过期。请再次输入地名以刷新。',
                    ja: '⏱ その提案は期限切れです。もう一度地名を入力して更新してください。',
                    es: '⏱ Esa sugerencia ha caducado. Escribe de nuevo el nombre del lugar para actualizar.'
                  },
  'bot.location.share':        { en: "📍 Tap to share your location, or type a place name. I'll search after.",
                                 fr: '📍 Touchez pour partager votre position, ou tapez un nom de lieu. Je chercherai ensuite.' ,
                         id: '📍 Ketuk untuk membagikan lokasi Anda, atau ketik nama tempat. Saya akan mencarinya nanti.',
                         ru: '📍 Нажмите, чтобы поделиться своим местоположением, или введите название места. Я выполню поиск позже.',
                         de: '📍 Tippe, um deinen Standort zu teilen, oder gib einen Ortsnamen ein. Ich suche anschließend.',
                         zh: '📍 点击分享您的位置，或输入地点名称。我稍后会搜索。',
                         ja: '📍 タップして現在地を共有するか、場所の名前を入力してください。後で検索します。',
                         es: '📍 Toca para compartir tu ubicación o escribe el nombre de un lugar. Yo lo buscaré después.'
                       },
  'bot.lang.set.en':           { en: '✅ Language set to English.', fr: '✅ Language set to English.' ,
                      id: '✅ Bahasa diatur ke Bahasa Inggris.',
                      ru: '✅ Язык установлен на английский.',
                      de: '✅ Sprache auf Englisch eingestellt.',
                      zh: '✅ 语言已设置为英语。',
                      ja: '✅ 言語設定は英語です。',
                      es: '✅ Idioma configurado en inglés.'
                    },
  'bot.lang.set.fr':           { en: '✅ Langue réglée sur français.', fr: '✅ Langue réglée sur français.' ,
                      id: '✅ Bahasa réglée sur français.',
                      ru: '✅ Правовой язык по-французски.',
                      de: '✅ Geregelte Sprache auf Französisch.',
                      zh: '✅ 法语语言。',
                      ja: '✅ ラング・レグレ・シュル・フランセ。',
                      es: '✅ Idioma réglee sur français.'
                    },
  // v0.62.480 — acks for the extended /language set. Each shows in the
  // chosen tongue (en+fr keys carry the same native string) so the user
  // gets confirmation in the language they just picked. The line notes
  // that the confirmation applies to the Mini-App surfaces.
  'bot.lang.set.id':           { en: '✅ Bahasa disetel ke Indonesia (untuk Mini App).', fr: '✅ Bahasa disetel ke Indonesia (untuk Mini App).' ,
                      id: '✅ Bahasa disetel ke Indonesia (untuk Aplikasi Mini).',
                      ru: '✅ Доставка в Индонезию (без мини-приложения).',
                      de: '✅ Bahasa Indonesia (für die Mini-App).',
                      zh: '✅ 印度尼西亚语（untuk 迷你应用程序）。',
                      ja: '✅ インドネシア語 (untuk ミニアプリ)。',
                      es: '✅ Bahasa disetel ke Indonesia (para la mini aplicación).'
                    },
  'bot.lang.set.ru':           { en: '✅ Язык переключён на русский (для мини-приложений).', fr: '✅ Язык переключён на русский (для мини-приложений).' ,
                      id: '✅ Язык переключён на русский (длячи-приложений).',
                      ru: '✅ Язык переведен на русский (для мини-приложений).',
                      de: '✅ Язык переключён на russisch (nur Minianwendung).',
                      zh: '✅ Язык переключён на русский (для мини-приложений)。',
                      ja: '✅ Язык переключён на русский (для мини-приложений)。',
                      es: '✅ Язык переключён на русский (для minи-приложений).'
                    },
  'bot.lang.set.de':           { en: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).', fr: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).' ,
                      id: '✅ Sprache auf Deutsch eingestellt (untuk Aplikasi Mini).',
                      ru: '✅ Sprache auf Deutsch eingestellt (для мини-приложений).',
                      de: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).',
                      zh: '✅ Sprache auf Deutsch eingestellt（用于迷你应用程序）。',
                      ja: '✅ Deutsch eingestellt (ミニアプリについて) を読み上げます。',
                      es: '✅ Sprache auf Deutsch eingestellt (para las miniaplicaciones).'
                    },
  'bot.lang.set.zh':           { en: '✅ 语言已设置为中文（用于小程序）。', fr: '✅ 语言已设置为中文（用于小程序）。' ,
                      id: '✅ 语言已设置为中文（用于小程序）。',
                      ru: '✅ 语言已设置为中文（用于小程序）。',
                      de: '✅ 语言已设置为中文（用于小程序）.',
                      zh: '✅ 语言已设置为中文（用于小程序）。',
                      ja: '✅ 説明文は中国語（小プログラム用）として設定されています。',
                      es: '✅ 语言已设置为中文（用于小程序）。'
                    },
  'bot.lang.set.ja':           { en: '✅ 言語を日本語に設定しました（ミニアプリ用）。', fr: '✅ 言語を日本語に設定しました（ミニアプリ用）。' ,
                      id: '✅ 言語を日本語に設定しました（ミニアプリ用）。',
                      ru: '✅ 言語を日本語に設定しました（ミニアプリ用）。',
                      de: '✅ 言語を日本語に設定しました（ミニアプリ用）.',
                      zh: '✅ 言语を日本语に设定しました（ミniaapuri用）。',
                      ja: '✅ 言語を日本語に設定しました（ミニアプリ用）。',
                      es: '✅ 言語を日本語に設定しました（ミニアプリ用）.'
                    },
  'bot.lang.set.es':           { en: '✅ Idioma configurado en español (para las Mini Apps).', fr: '✅ Idioma configurado en español (para las Mini Apps).' ,
                      id: '✅ Konfigurasi idiom dalam bahasa Spanyol (untuk Aplikasi Mini).',
                      ru: '✅ Идиома, настроенная на испанском языке (для мини-приложений).',
                      de: '✅ Auf Spanisch konfigurierte Sprache (für Mini-Apps).',
                      zh: '✅ Idioma configurado en español（迷你应用程序）。',
                      ja: '✅ スペイン語での設定 (ミニアプリなど)。',
                      es: '✅ Idioma configurado en español (para las Mini Apps).'
                    },

  // v0.59.1 — chat chrome localisation. Covers /weather, /transport (+ all
  // sub-views), /hawker, /carpark, /forgetme, /language, /start intro.
  // Shared button labels (used across multiple surfaces).
  'button.back':               { en: '⬅️ Back', fr: '⬅️ Retour' ,
                  id: '⬅️ Kembali',
                  ru: '⬅️ Назад',
                  de: '⬅️ Zurück',
                  zh: '⬅️ 返回',
                  ja: '⬅️ 戻る',
                  es: '⬅️ Volver'
                },
  'button.refresh':            { en: '🔄 Refresh', fr: '🔄 Actualiser' ,
                     id: '🔄 Segarkan',
                     ru: '🔄 Обновить',
                     de: '🔄 Aktualisieren',
                     zh: '🔄 刷新',
                     ja: '🔄 更新',
                     es: '🔄 Actualizar'
                   },

  // /weather
  'weather.title':             { en: '☀️ Singapore weather', fr: '☀️ Météo de Singapour' ,
                    id: '☀️ Cuaca Singapura',
                    ru: '☀️ Погода в Сингапуре',
                    de: '☀️ Wetter in Singapur',
                    zh: '☀️ 新加坡天气',
                    ja: '☀️ シンガポールの天気',
                    es: '☀️ Clima de Singapur'
                  },
  'weather.temp':              { en: 'Temperature: {c}°C · {f}°F', fr: 'Température : {c} °C · {f} °F' ,
                   id: 'Suhu: {c} °C · {f} °F',
                   ru: 'Температура: {c} °C · {f} °F',
                   de: 'Temperatur: {c} °C · {f} °F',
                   zh: '温度： {c} °C · {f} °F',
                   ja: '温度： {c} °C · {f} °F',
                   es: 'Temperatura: {c} °C · {f} °F'
                 },
  'weather.humidity':          { en: 'Humidity: {pct}%', fr: 'Humidité : {pct} %' ,
                       id: 'Kelembapan: {pct} %',
                       ru: 'Влажность: {pct} %',
                       de: 'Luftfeuchtigkeit: {pct} %',
                       zh: '湿度： {pct} %',
                       ja: '湿度： {pct} %',
                       es: 'Humedad: {pct} %'
                     },
  'weather.rain':              { en: 'Rain: {mm} mm @ {at}', fr: 'Pluie : {mm} mm @ {at}' ,
                   id: 'Hujan: {mm} mm @ {at}',
                   ru: 'Осадки: {mm} мм @ {at}',
                   de: 'Regen: {mm} mm @ {at}',
                   zh: '降雨量： {mm}毫米 @ {at}',
                   ja: '降水量： {mm} mm @ {at}',
                   es: 'Lluvia: {mm} mm a {at}'
                 },
  'weather.wind':              { en: 'Wind: {kt} kt{dir}', fr: 'Vent : {kt} kt{dir}' ,
                   id: 'Angin: {kt} kt {dir}',
                   ru: 'Ветер: {kt} кт {dir}',
                   de: 'Wind: {kt} kt {dir}',
                   zh: '风速： {kt} kt {dir}',
                   ja: '風速: {kt} kt {dir}',
                   es: 'Viento: {kt} kt {dir}'
                 },
  'weather.forecastNext2h':    { en: 'Next 2 hours in {area}: {desc}{valid}', fr: 'Prochaines 2 h à {area} : {desc}{valid}' ,
                             id: '2 jam berikutnya di {area} : {desc} {valid}',
                             ru: 'Следующие 2 часа в {area} : {desc} {valid}',
                             de: 'Nächste 2 Stunden in {area} : {desc} {valid}',
                             zh: '接下来两小时在{area} ： {desc} {valid}',
                             ja: '{area}の今後 2 時間: {desc} {valid}',
                             es: 'Próximas 2 horas en {area} : {desc} {valid}'
                           },
  'weather.forecastUntil':     { en: ' (until {time})', fr: ' (jusqu’à {time})' ,
                            id: '(hingga {time} )',
                            ru: '(до {time} )',
                            de: '(bis {time} )',
                            zh: '（直到{time} ）',
                            ja: '（ {time}まで）',
                            es: '(hasta {time} )'
                          },
  'weather.unreachable':       { en: "Sorry, I can't reach the NEA weather feed right now.", fr: "Désolé, le flux météo NEA est inaccessible pour le moment." ,
                          id: 'Maaf, saya tidak bisa mengakses siaran cuaca NEA saat ini.',
                          ru: 'Извините, сейчас я не могу получить доступ к прогнозу погоды NEA.',
                          de: 'Tut mir leid, ich kann den NEA-Wetterfeed im Moment nicht erreichen.',
                          zh: '抱歉，我现在无法访问NEA天气预报。',
                          ja: '申し訳ありませんが、現在NEAの天気予報フィードにアクセスできません。',
                          es: 'Lo siento, no puedo acceder al servicio meteorológico de la NEA en este momento.'
                        },
  // v0.60.118 — /weather expansion
  'weather.areaUnknown':       { en: "I don't know that area — try a town name like Tampines, or just /weather to use your shared pin.", fr: "Je ne connais pas cette zone — essayez un nom de quartier comme Tampines, ou simplement /weather pour utiliser votre position partagée." ,
                          id: 'Saya tidak mengenal daerah itu — coba nama kota seperti Tampines, atau cukup ketik /weather untuk menggunakan pin yang Anda bagikan.',
                          ru: 'Я не знаю этот район — попробуйте ввести название города, например, Тампинес, или просто /weather , чтобы использовать свою метку.',
                          de: 'Ich kenne diese Gegend nicht – versuchen Sie es mit einem Ortsnamen wie Tampines oder geben Sie einfach /weather ein, um Ihre geteilte PIN zu verwenden.',
                          es: 'No conozco esa zona; prueba con el nombre de una ciudad como Tampines, o simplemente /weather para usar el marcador que has compartido.'
                        ,
                          zh: '我不熟悉那个地区——试试淡滨尼之类的城镇名称，或者直接输入 /weather 来使用你共享的图钉。',
                          ja: 'その地域はよく知らないので、タンピネスのような町名を試してみるか、 /weather と入力して共有ピンを使ってみてください。'
                        },
  'weather.forArea':           { en: '— for {area} —', fr: '— pour {area} —' ,
                      id: '— untuk {area} —',
                      ru: '— для {area} —',
                      de: '— für {area} —',
                      zh: '— 适用于{area} —',
                      ja: '— {area}向け —',
                      es: '— para {area} —'
                    },
  'weather.headOutRaining':    { en: "☔ Raining around {area} right now — hold ~20–30 min or pick somewhere covered.", fr: "☔ Il pleut autour de {area} en ce moment — patientez ~20–30 min ou choisissez un endroit couvert." ,
                             id: '☔ Saat ini sedang hujan di sekitar {area} — tunggu sekitar 20-30 menit atau pilih tempat yang terlindung.',
                             ru: '☔ Сейчас в районе {area} идёт дождь — подождите 20-30 минут или выберите место, защищенное от дождя.',
                             de: '☔ Es regnet gerade in der Gegend um {area} — warten Sie ~20–30 Minuten oder suchen Sie sich einen überdachten Ort.',
                             zh: '☔ 现在{area}附近正在下雨——请等待约20-30分钟或找个有遮挡的地方。',
                             ja: '☔ 現在、 {area}周辺では雨が降っています。20～30分ほどお待ちいただくか、屋根のある場所へお進みください。',
                             es: '☔ Está lloviendo en los alrededores {area} ahora mismo; espere entre 20 y 30 minutos o elija un lugar cubierto.'
                           },
  'weather.headOutShowery':    { en: "🌦️ Dry now, but {area}'s 2-hour outlook is {desc} — head out soon if you're going somewhere open-air.", fr: "🌦️ Sec pour l’instant, mais les prévisions 2 h à {area} sont : {desc} — sortez bientôt si vous allez en plein air." ,
                             id: '🌦️ Saat ini kering, tetapi prakiraan cuaca 2 jam ke depan untuk {area} adalah {desc} — segera berangkat jika Anda akan pergi ke tempat terbuka.',
                             ru: '🌦️ Сейчас сухо, но прогноз погоды на 2 часа для {desc} {area} — отправляйтесь на улицу как можно скорее, если планируете куда-то на открытом воздухе.',
                             de: '🌦️ Im Moment ist es trocken, aber die 2-Stunden-Vorhersage für {area} lautet {desc} – wenn Sie irgendwo im Freien unterwegs sind, sollten Sie bald losziehen.',
                             zh: '🌦️ 现在天气干燥，但{area}的 2 小时天气预报为{desc} — 如果你要去户外场所，请尽快出发。',
                             ja: '🌦️ 今は乾燥していますが、 {area}の 2 時間後の予報は{desc}です。屋外に出かける予定の方は、早めに出発してください。',
                             es: '🌦️ Ahora está seco, pero el pronóstico para las próximas 2 horas en {area} es {desc} ; salga pronto si va a algún lugar al aire libre.'
                           },
  'weather.headOutGood':       { en: "✅ Good window — {area} looks dry for the next 2 hours.", fr: "✅ Bon créneau — {area} devrait rester au sec pendant 2 h." ,
                          id: '✅ Jendela yang bagus — {area} terlihat kering selama 2 jam ke depan.',
                          ru: '✅ Окно в хорошем состоянии — {area} будет выглядеть сухой в течение следующих 2 часов.',
                          de: '✅ Gutes Wetterfenster — {area} sieht für die nächsten 2 Stunden trocken aus.',
                          zh: '✅ 天气晴好—— {area}未来2小时内看起来会很干燥。',
                          ja: '✅ 良い見通しです — {area}は今後 2 時間ほど乾燥した状態が続くようです。',
                          es: '✅ Buena ventana: {area} parece seca durante las próximas 2 horas.'
                        },
  'weather.hotNudge':          { en: "🥵 Feels hot out — an air-conditioned spot might be nicer.", fr: "🥵 Il fait chaud dehors — un endroit climatisé serait peut-être plus agréable." ,
                       id: '🥵 Cuacanya panas sekali — tempat ber-AC mungkin lebih nyaman.',
                       ru: '🥵 На улице жарко — в помещении с кондиционером было бы приятнее.',
                       de: '🥵 Es ist heiß draußen – ein klimatisierter Ort wäre vielleicht angenehmer.',
                       zh: '🥵 外面好热——有空调的地方会舒服些。',
                       ja: '🥵 外は暑いですね。エアコンの効いた場所の方がいいかもしれません。',
                       es: '🥵 Hace calor afuera; un lugar con aire acondicionado sería más agradable.'
                     },
  'weather.tonight':           { en: "🌙 Tonight in the {zone}: {desc}.", fr: "🌙 Ce soir dans le {zone} : {desc}." ,
                      id: '🌙 Malam ini di {zone} : {desc} .',
                      ru: '🌙 Сегодня вечером в {zone} : {desc} .',
                      de: '🌙 Heute Abend in der {zone} : {desc} .',
                      zh: '🌙 今晚在{zone} : {desc} 。',
                      ja: '🌙 今夜の{zone} ： {desc} 。',
                      es: '🌙 Esta noche en la {zone} : {desc} .'
                    },
  // per-pick rain caveat (rendered on open-air venue cards)
  'weather.rainNowNear':       { en: "🌧️ Raining around {area} right now — covered seating helps.", fr: "🌧️ Il pleut autour de {area} en ce moment — un coin couvert est préférable." ,
                          id: '🌧️ Hujan turun di sekitar {area} saat ini — tempat duduk yang terlindungi sangat membantu.',
                          ru: '🌧️ Сейчас в районе {area} идёт дождь — крытые места для сидения очень помогают.',
                          de: '🌧️ Es regnet gerade in der Gegend um {area} – überdachte Sitzgelegenheiten helfen.',
                          zh: '🌧️现在{area}附近正在下雨——有遮雨棚的座位很有帮助。',
                          ja: '🌧️ 現在、 {area}周辺では雨が降っています。屋根付きの座席があると便利です。',
                          es: '🌧️ Está lloviendo en {area} ahora mismo; sentarse bajo techo ayuda.'
                        },
  'weather.rainSoonNear':      { en: "🌧️ {desc} in {area}'s 2-hour outlook — covered seating helps.", fr: "🌧️ Prévisions 2 h à {area} : {desc} — un coin couvert est préférable." ,
                           id: '🌧️ {desc} dalam prospek 2 jam di {area} — tempat duduk beratap sangat membantu.',
                           ru: '🌧️ {desc} в {area} с прогнозом погоды на 2 часа — наличие мест под навесом поможет.',
                           de: '🌧️ {desc} in {area} 2-Stunden-Aussicht — überdachte Sitzplätze helfen.',
                           zh: '🌧️ {desc}在{area}的 2 小时展望中 — 有遮挡的座位有所帮助。',
                           ja: '🌧️ {desc}の{area}の 2 時間予報 — 屋根付きの座席が役立ちます。',
                           es: '🌧️ {desc} en {area} Pronóstico de 2 horas: los asientos cubiertos ayudan.'
                         },

  // /carpark
  'carpark.offline':           { en: 'Carpark lookup is offline (LTA key not configured).', fr: 'Recherche de parking hors-ligne (clé LTA non configurée).' ,
                      id: 'Pencarian tempat parkir sedang offline (kunci LTA belum dikonfigurasi).',
                      ru: 'Поиск парковки недоступен (ключ LTA не настроен).',
                      de: 'Parkplatzsuche offline (LTA-Schlüssel nicht konfiguriert).',
                      zh: '停车场查询功能已离线（LTA密钥未配置）。',
                      ja: '駐車場検索はオフラインです（LTAキーが設定されていません）。',
                      es: 'La búsqueda de aparcamientos no está disponible (la clave LTA no está configurada).'
                    },
  'carpark.lookingUp':         { en: '🅿️ Looking up nearest carparks…', fr: '🅿️ Recherche des parkings les plus proches…' ,
                        id: '🅿️ Mencari lokasi parkir terdekat…',
                        ru: '🅿️ Поиск ближайших парковок…',
                        de: '🅿️ Suche nach den nächstgelegenen Parkplätzen…',
                        zh: '🅿️ 正在查找附近的停车场…',
                        ja: '🅿️ 最寄りの駐車場を検索中…',
                        es: '🅿️ Buscando aparcamientos cercanos…'
                      },
  'carpark.none':              { en: 'No carparks with available lots near here.', fr: 'Aucun parking avec places disponibles à proximité.' ,
                   id: 'Tidak ada tempat parkir dengan lahan kosong di dekat sini.',
                   ru: 'Поблизости нет свободных парковочных мест.',
                   de: 'In der Nähe gibt es keine Parkplätze.',
                   zh: '附近没有空余车位的停车场。',
                   ja: 'この付近には空き駐車場がありません。',
                   es: 'No hay aparcamientos con plazas disponibles cerca de aquí.'
                 },
  'carpark.header':            { en: '🅿️ Nearest carparks with available lots', fr: '🅿️ Parkings les plus proches avec places disponibles' ,
                     id: '🅿️ Tempat parkir terdekat dengan lahan parkir yang tersedia',
                     ru: 'Ближайшие парковки со свободными местами',
                     de: '🅿️ Nächstgelegene Parkplätze mit freien Stellplätzen',
                     zh: '🅿️ 附近有空位的停车场',
                     ja: '🅿️ 空きのある最寄りの駐車場',
                     es: '🅿️ Aparcamientos más cercanos con plazas disponibles'
                   },
  'carpark.row':               { en: '{i}. {name}  ·  {lots} lots  ·  {dist}', fr: '{i}. {name}  ·  {lots} places  ·  {dist}' ,
                  id: '{i} . {name} · {lots} banyak · {dist}',
                  ru: '{i} . {name} · {lots} lots · {dist}',
                  de: '{i} . {name} · {lots} lots · {dist}',
                  zh: '{i} . {name} · {lots} lots · {dist}',
                  ja: '{i} . {name} · {lots} lots · {dist}',
                  es: '{i} . {name} · {lots} lotes · {dist}'
                },
  'carpark.mapAllCaption':     { en: 'Showing closest locations:', fr: 'Emplacements les plus proches :' ,
                            id: 'Menampilkan lokasi terdekat:',
                            ru: 'Показаны ближайшие места:',
                            de: 'Nächstgelegene Standorte werden angezeigt:',
                            zh: '显示最近地点：',
                            ja: '最寄りの場所を表示しています：',
                            es: 'Mostrando ubicaciones más cercanas:'
                          },
  'carpark.mapAllBtn':         { en: 'Compare all {n} carparks', fr: 'Comparer les {n} parkings' ,
                        id: 'Bandingkan semua {n} tempat parkir',
                        ru: 'Сравните все {n} парковок',
                        de: 'Vergleiche alle {n} Parkplätze',
                        zh: '比较所有{n}停车场',
                        ja: '{n}駐車場すべてを比較する',
                        es: 'Comparar todos {n} aparcamientos'
                      },
  'carpark.containerCaption':  { en: '🗺 Open all 5 carparks in one Google Maps container:', fr: '🗺 Ouvrir les 5 parkings dans un conteneur Google Maps :' ,
                               id: '🗺 Buka kelima tempat parkir dalam satu kontainer Google Maps:',
                               ru: '🗺 Откройте все 5 парковок в одном контейнере Google Maps:',
                               de: '🗺 Alle 5 Parkplätze in einem Google Maps-Container öffnen:',
                               zh: '🗺 在谷歌地图容器中打开全部 5 个停车场：',
                               ja: '🗺 5つの駐車場すべてを1つのGoogleマップコンテナで開く：',
                               es: '🗺 Abre los 5 aparcamientos en un solo contenedor de Google Maps:'
                             },
  'carpark.viewAllBtn':        { en: '🗺 View all carparks', fr: '🗺 Voir tous les parkings' ,
                         id: '🗺 Lihat semua tempat parkir',
                         ru: '🗺 Посмотреть все парковки',
                         de: '🗺 Alle Parkplätze anzeigen',
                         zh: '🗺 查看所有停车场',
                         ja: '🗺 全ての駐車場を見る',
                         es: '🗺 Ver todos los aparcamientos'
                       },
  'carpark.unreachable':       { en: "Sorry, I can't reach the LTA carpark feed right now.", fr: "Désolé, le flux LTA des parkings est inaccessible pour le moment." ,
                          id: 'Maaf, saya tidak bisa mengakses feed parkir LTA saat ini.',
                          ru: 'Извините, сейчас я не могу получить доступ к данным о парковках LTA.',
                          de: 'Tut mir leid, ich kann den LTA-Parkplatz-Feed im Moment nicht erreichen.',
                          zh: '抱歉，我现在无法访问陆路交通管理局停车场的数据流。',
                          ja: '申し訳ありませんが、現在LTAの駐車場フィードにアクセスできません。',
                          es: 'Lo siento, no puedo acceder a la fuente de datos del aparcamiento de la LTA en este momento.'
                        },

  // /hawker
  'hawker.title':              { en: '🍚 Singapore Hawker Centres & Food Centres (2025). By NEA', fr: '🍚 Centres de hawkers et de restauration de Singapour (2025). Par la NEA' ,
                   id: '🍚 Pusat Jajanan & Pusat Makanan Singapura (2025). Oleh NEA',
                   ru: '🍚 Центры уличной еды и фуд-корты Сингапура (2025). Проект NEA.',
                   de: '🍚 Singapurs Hawker-Zentren und Food-Center (2025). Von der NEA',
                   zh: '🍚 新加坡小贩中心及美食中心（2025）。由国家环境局发布。',
                   ja: '🍚 シンガポールのホーカーセンターとフードセンター（2025年）。NEAによる',
                   es: '🍚 Centros de comida callejera y centros gastronómicos de Singapur (2025). Por NEA'
                 },
  'hawker.openTmaBtn':         { en: '🍚 Open Hawker Centre', fr: '🍚 Ouvrir l’app Hawker' ,
                        id: '🍚 Pusat Kuliner Buka',
                        ru: '🍚 Открытый центр уличной еды',
                        de: '🍚 Offenes Hawker-Zentrum',
                        zh: '🍚 开放式小贩中心',
                        ja: '🍚 オープンホーカーセンター',
                        es: '🍚 Centro de comida ambulante abierto'
                      },

  // /transport top menu
  'transport.menu.title':      { en: '🇸🇬 *Transport*', fr: '🇸🇬 *Transports*' ,
                           id: '🇸🇬 *Transportasi*',
                           ru: '🇸🇬 *Транспорт*',
                           de: '🇸🇬 *Transport*',
                           zh: '🇸🇬 *交通*',
                           ja: '🇸🇬 *交通機関*',
                           es: '🇸🇬 *Transporte*'
                         },
  'transport.menu.btn.train':       { en: '🚇 Train', fr: '🚇 Métro' ,
                               id: '🚇 Kereta',
                               ru: '🚇 Поезд',
                               de: '🚇 Zug',
                               zh: '🚇 火车',
                               ja: '🚇電車',
                               es: '🚇 Tren'
                             },
  'transport.menu.btn.bus':         { en: '🚌 Bus', fr: '🚌 Bus' ,
                             id: '🚌 Bus',
                             ru: '🚌 Автобус',
                             de: '🚌 Bus',
                             zh: '🚌 公交车',
                             ja: '🚌 バス',
                             es: '🚌 Autobús'
                           },
  'transport.menu.btn.incidents':   { en: '🚦 Incidents', fr: '🚦 Incidents' ,
                                   id: '🚦 Insiden',
                                   ru: '🚦 Инциденты',
                                   de: '🚦 Vorfälle',
                                   zh: '🚦 事件',
                                   ja: '🚦 事件',
                                   es: '🚦 Incidentes'
                                 },
  'transport.menu.btn.drive':       { en: '🚗 Drive', fr: '🚗 Voiture' ,
                               id: '🚗 Mengemudi',
                               ru: '🚗 Вождение',
                               de: '🚗 Fahren',
                               zh: '🚗 驾车',
                               ja: '🚗 ドライブ',
                               es: '🚗 Conducir'
                             },
  'transport.menu.btn.refreshLoc':  { en: '📍 Refresh location', fr: '📍 Actualiser la position' ,
                                    id: '📍 Segarkan lokasi',
                                    ru: '📍 Обновить местоположение',
                                    de: '📍 Standort aktualisieren',
                                    zh: '📍刷新位置',
                                    ja: '📍 場所を更新',
                                    es: '📍 Actualizar ubicación'
                                  },

  // /transport bus sub-menu
  'transport.bus.menu.title':       { en: '🚌 Bus Information', fr: '🚌 Informations bus' ,
                               id: '🚌 Informasi Bus',
                               ru: '🚌 Информация об автобусах',
                               de: '🚌 Businformationen',
                               zh: '🚌 公交信息',
                               ja: '🚌 バス情報',
                               es: '🚌 Información sobre autobuses'
                             },
  'transport.bus.menu.btn.nearest': { en: 'Nearest Bus Stops', fr: 'Arrêts de bus proches' ,
                                     id: 'Halte Bus Terdekat',
                                     ru: 'Ближайшие автобусные остановки',
                                     de: 'Nächstgelegene Bushaltestellen',
                                     zh: '最近的公交车站',
                                     ja: '最寄りのバス停',
                                     es: 'Paradas de autobús más cercanas'
                                   },
  'transport.bus.menu.btn.route':   { en: '🗺 Plan a route', fr: '🗺 Planifier un itinéraire' ,
                                   id: '🗺 Rencanakan rute',
                                   ru: '🗺 Составьте маршрут',
                                   de: '🗺 Route planen',
                                   zh: '🗺 规划路线',
                                   ja: '🗺 ルートを計画する',
                                   es: '🗺 Planifica una ruta'
                                 },

  // /transport train view
  'transport.train.heading':        { en: '🚇 Train (MRT)', fr: '🚇 Métro (MRT)' ,
                              id: '🚇 Kereta (MRT)',
                              ru: '🚇 Поезд (MRT)',
                              de: '🚇 Zug (MRT)',
                              zh: '🚇 地铁（MRT）',
                              ja: '🚇 電車（MRT）',
                              es: '🚇 Tren (MRT)'
                            },
  'transport.train.status':         { en: 'Status: {status}', fr: 'État : {status}' ,
                             id: 'Status: {status}',
                             ru: 'Статус: {status}',
                             de: 'Status: {status}',
                             zh: '状态： {status}',
                             ja: 'ステータス: {status}',
                             es: 'Estado: {status}'
                           },
  'transport.train.notes':          { en: 'Notes: {note}', fr: 'Remarques : {note}' ,
                            id: 'Catatan: {note}',
                            ru: 'Примечания: {note}',
                            de: 'Anmerkungen: {note}',
                            zh: '备注： {note}',
                            ja: '注記: {note}',
                            es: 'Notas: {note}'
                          },
  'transport.train.refreshed':      { en: 'Refreshed: {at}', fr: 'Actualisé : {at}' ,
                                id: 'Diperbarui: {at}',
                                ru: 'Обновлено: {at}',
                                de: 'Aktualisiert: {at}',
                                zh: '已刷新： {at}',
                                ja: '更新日時: {at}',
                                es: 'Actualizado: {at}'
                              },
  'transport.train.warmup':         { en: 'Status: 🟡 warming up; try again in 30 s.', fr: 'État : 🟡 démarrage en cours ; réessayez dans 30 s.' ,
                             id: 'Status: 🟡 sedang pemanasan; coba lagi dalam 30 detik.',
                             ru: 'Статус: 🟡 разогреваемся; попробуйте снова через 30 с.',
                             de: 'Status: 🟡 Aufwärmen; versuchen Sie es in 30 Sekunden erneut.',
                             zh: '状态：🟡 正在预热；30 秒后再试。',
                             ja: '状態: 🟡 ウォーミングアップ中。30秒後にもう一度お試しください。',
                             es: 'Estado: 🟡 Calentando; inténtalo de nuevo en 30 s.'
                           },
  'transport.train.crowd.l':        { en: '🟢 low', fr: '🟢 faible' ,
                              id: '🟢 rendah',
                              ru: '🟢 низкий',
                              de: '🟢 niedrig',
                              zh: '🟢 低',
                              ja: '🟢 低い',
                              es: '🟢 bajo'
                            },
  'transport.train.crowd.m':        { en: '🟡 medium', fr: '🟡 moyen' ,
                              id: '🟡 sedang',
                              ru: '🟡 средний',
                              de: '🟡 mittel',
                              zh: '🟡 中等',
                              ja: '🟡 中',
                              es: '🟡 mediano'
                            },
  'transport.train.crowd.h':        { en: '🔴 high', fr: '🔴 élevé' ,
                              id: '🔴 tinggi',
                              ru: '🔴 высокий',
                              de: '🔴 hoch',
                              zh: '🔴 高',
                              ja: '🔴 高い',
                              es: '🔴 alto'
                            },
  'transport.train.nearestHeader':  { en: '🚇 Nearest 3 Train stations{wx}', fr: '🚇 3 stations de train les plus proches{wx}' ,
                                    id: '🚇 3 Stasiun Kereta Terdekat {wx}',
                                    ru: '🚇 Ближайшие 3 железнодорожные станции {wx}',
                                    de: '🚇 Die 3 nächstgelegenen Bahnhöfe {wx}',
                                    zh: '🚇 最近的 3 个火车站{wx}',
                                    ja: '🚇 最寄りの3つの駅{wx}',
                                    es: '🚇 Las 3 estaciones de tren más cercanas {wx}'
                                  },
  'transport.train.noLocation':     { en: '🚇 Share your location once and Soleat will list the nearest MRT stations too.', fr: '🚇 Partagez votre position une fois et Soleat listera aussi les stations MRT les plus proches.' ,
                                 id: '🚇 Bagikan lokasi Anda sekali saja dan Soleat akan menampilkan stasiun MRT terdekat juga.',
                                 ru: '🚇 Укажите свое местоположение один раз, и Soleat также покажет ближайшие станции метро.',
                                 de: '🚇 Teilen Sie Ihren Standort einmalig mit, und Soleat listet Ihnen auch die nächstgelegenen MRT-Stationen auf.',
                                 zh: '🚇 分享一次您的位置，Soleat 就会列出最近的地铁站。',
                                 ja: '🚇 一度現在地を共有すると、Soleat が最寄りの MRT 駅も表示します。',
                                 es: '🚇 Comparte tu ubicación una sola vez y Soleat también te mostrará las estaciones de MRT más cercanas.'
                               },
  // v0.60.88 — operator 2026-05-11: invert the message — surface
  // CROWDED counts (medium + high) instead of uncrowded, and name
  // the lines those platforms sit on. `lines` placeholder is filled
  // by index.js from summary.crowdedLines when present.
  'transport.train.network.low':    { en: '🟢 Network is uncrowded — 0 of {total} platforms above low density.',
                                      fr: '🟢 Réseau peu chargé — 0 quai sur {total} au-dessus de la faible densité.' ,
                                  id: '🟢 Jaringan tidak padat — 0 dari {total} platform di atas kepadatan rendah.',
                                  ru: '🟢 Сеть не перегружена — 0 из {total} платформ расположены выше низкой плотности.',
                                  de: '🟢 Das Netzwerk ist nicht überlastet — 0 von {total} Plattformen weisen eine geringe Dichte auf.',
                                  zh: '🟢 网络不拥挤 — 0 个{total}高于低密度。',
                                  ja: '🟢 ネットワークは混雑していません — 低密度以上のプラットフォームは{total}個中 0 個です。',
                                  es: '🟢 La red no está saturada: 0 de {total} plataformas superan la baja densidad.'
                                },
  'transport.train.network.medium': { en: '🟡 {medium} moderate · {high} high (of {total}) — Lines: {lines}',
                                      fr: '🟡 {medium} modéré · {high} élevé (sur {total}) — Lignes : {lines}' ,
                                     id: '🟡 {medium} sedang · {high} tinggi (dari {total} ) — Baris: {lines}',
                                     ru: '🟡 {medium} умеренный · {high} высокий (из {total} ) — Строки: {lines}',
                                     de: '🟡 {medium} moderat · {high} hoch (von {total} ) — Zeilen: {lines}',
                                     zh: '🟡 {medium}中等 · {high}高（占{total}的百分比）— 行数： {lines}',
                                     ja: '🟡 {medium}中程度 · {high}高 ( {total}のうち) — 行数: {lines}',
                                     es: '🟡 {medium} moderado · {high} alto (de {total} ) — Líneas: {lines}'
                                   },
  'transport.train.network.high':   { en: '🔴 {high} high · {medium} moderate (of {total}) — Lines: {lines}',
                                      fr: '🔴 {high} élevé · {medium} modéré (sur {total}) — Lignes : {lines}' ,
                                   id: '🔴 {high} tinggi · {medium} moderat (dari {total} ) — Baris: {lines}',
                                   ru: '🔴 {high} высокий · {medium} умеренный (из {total} ) — Строки: {lines}',
                                   de: '🔴 {high} hoch · {medium} mittel (von {total} ) — Zeilen: {lines}',
                                   zh: '🔴 {high} · {medium} （ {total} ）— 行数： {lines}',
                                   ja: '🔴 {high}高 · {medium}中程度 ( {total}のうち) — 行数: {lines}',
                                   es: '🔴 {high} alto · {medium} moderado (de {total} ) — Líneas: {lines}'
                                 },
  'transport.train.affectedLines':  { en: '⚠️ Affected lines:', fr: '⚠️ Lignes affectées :' ,
                                    id: '⚠️ Jalur yang terpengaruh:',
                                    ru: '⚠️ Затронутые строки:',
                                    de: '⚠️ Betroffene Linien:',
                                    zh: '⚠️受影响的线路：',
                                    ja: '⚠️ 影響を受ける行:',
                                    es: '⚠️ Líneas afectadas:'
                                  },
  // v0.60.75 — static MRT network frequency footer (LTA published).
  // Stand-in for per-train arrival times (LTA DataMall doesn't expose
  // them) — gives users a calibration of when to expect the next train.
  // v0.60.88 — operator 2026-05-11: swap 🚇 → ⏱️ since the line is
  // about timing, not trains.
  'transport.train.headway':        { en: '⏱️ Frequency: {peakMin}–{peakMax} min peak · {offMin}–{offMax} min off-peak (LTA published)',
                                      fr: '⏱️ Fréquence : {peakMin}–{peakMax} min en heure de pointe · {offMin}–{offMax} min hors pointe (LTA publié)' ,
                              id: '⏱️ Frekuensi: {peakMin} – {peakMax} min puncak · {offMin} – {offMax} min di luar jam sibuk (LTA diterbitkan)',
                              ru: '⏱️ Частота: {peakMin} – {peakMax} мин пик · {offMin} – {offMax} мин вне пика (опубликовано LTA)',
                              de: '⏱️ Frequenz: {peakMin} – {peakMax} min peak · {offMin} – {offMax} min off peak (LTA veröffentlicht)',
                              zh: '⏱️ 频率： {peakMin} – {peakMax}最小峰值 · {offMin} – {offMax}最小非峰值（LTA 发布）',
                              ja: '⏱️ 周波数: {peakMin} – {peakMax}最小ピーク時 · {offMin} – {offMax}最小オフピーク時 (LTA 公開)',
                              es: '⏱️ Frecuencia: {peakMin} – {peakMax} min pico · {offMin} – {offMax} min fuera de pico (publicado por LTA)'
                            },
  // v0.60.97 — operator: spell "d" as "days" / "jours".
  'transport.train.engineering':    { en: '🔧 Upcoming engineering (next 7 days):', fr: '🔧 Travaux à venir (sous 7 jours) :' ,
                                  id: '🔧 Kegiatan teknik mendatang (7 hari ke depan):',
                                  ru: '🔧 Предстоящие инженерные работы (в течение следующих 7 дней):',
                                  de: '🔧 Kommende technische Projekte (nächste 7 Tage):',
                                  zh: '🔧 即将进行的工程（未来7天）：',
                                  ja: '🔧 今後のエンジニアリング（今後7日間）：',
                                  es: '🔧 Próximas actividades de ingeniería (próximos 7 días):'
                                },
  // v0.60.98 — operator: rename to '🇸🇬 Train Map and Status' so
  // the chat CTA reads as a destination, not an action verb.
  'transport.train.openMapBtn':     { en: '🇸🇬 Train Map and Status', fr: '🇸🇬 Carte et état des trains' ,
                                 id: 'Peta dan Status Kereta Api 🇸🇬',
                                 ru: '🇸🇬 Карта и статус поездов',
                                 de: '🇸🇬 Zugnetzplan und Status',
                                 zh: '🇸🇬 列车地图和状态',
                                 ja: '🇸🇬 列車の路線図と運行状況',
                                 es: '🇸🇬 Mapa y estado de los trenes'
                               },
  'transport.train.unreachable':    { en: "Sorry, I can't reach the MRT feed right now.", fr: "Désolé, le flux MRT est inaccessible pour le moment." ,
                                  id: 'Maaf, saya tidak bisa mengakses siaran MRT saat ini.',
                                  ru: 'Извините, сейчас я не могу получить доступ к трансляции MRT.',
                                  de: 'Tut mir leid, ich kann den MRT-Feed im Moment nicht erreichen.',
                                  zh: '抱歉，我现在无法访问地铁信号。',
                                  ja: '申し訳ありませんが、現在MRTのフィードにアクセスできません。',
                                  es: 'Lo siento, no puedo acceder a la transmisión del MRT en este momento.'
                                },

  // /transport bus
  'transport.bus.noLocation':       { en: '🚌 I need your location first — share it once via the menu (📍) and Soleat will remember.', fr: '🚌 J’ai d’abord besoin de votre position — partagez-la une fois via le menu (📍) et Soleat s’en souviendra.' ,
                               id: '🚌 Saya perlu lokasi Anda terlebih dahulu — bagikan sekali melalui menu (📍) dan Soleat akan mengingatnya.',
                               ru: '🚌 Сначала мне нужно ваше местоположение — укажите его один раз через меню (📍), и Soleat запомнит его.',
                               de: '🚌 Zuerst benötige ich Ihren Standort – teilen Sie ihn einmal über das Menü (📍) mit, und Soleat wird ihn sich merken.',
                               zh: '🚌 我需要先知道您的位置——通过菜单（📍）分享一次，Soleat 就会记住。',
                               ja: '🚌 まずあなたの現在地が必要です。メニューから一度共有してください（📍）。そうすればSoleatが記憶します。',
                               es: '🚌 Primero necesito tu ubicación; compártela una vez a través del menú (📍) y Soleat lo recordará.'
                             },
  'transport.bus.offline':          { en: '🚌 Bus lookup is offline (LTA key not configured).', fr: '🚌 Recherche de bus hors-ligne (clé LTA non configurée).' ,
                            id: '🚌 Pencarian bus sedang offline (kunci LTA belum dikonfigurasi).',
                            ru: '🚌 Поиск автобусов недоступен (ключ LTA не настроен).',
                            de: '🚌 Bussuche offline (LTA-Schlüssel nicht konfiguriert).',
                            zh: '🚌 公交车查询已离线（LTA 密钥未配置）。',
                            ja: '🚌 バス検索はオフラインです（LTAキーが設定されていません）。',
                            es: '🚌 La búsqueda de autobuses no está disponible (la clave LTA no está configurada).'
                          },
  'transport.bus.noStopsNearest':   { en: '🚏 No bus stops within 800 m of your saved location.', fr: '🚏 Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' ,
                                   id: '🚏 Tidak ada halte bus dalam radius 800 m dari lokasi yang Anda simpan.',
                                   ru: '🚏 В радиусе 800 м от вашего сохраненного местоположения нет автобусных остановок.',
                                   de: '🚏 Keine Bushaltestellen im Umkreis von 800 m um Ihren gespeicherten Standort.',
                                   zh: '🚏 您保存的位置附近 800 米内没有公交车站。',
                                   ja: '🚏 保存した場所から800m以内にバス停はありません。',
                                   es: '🚏 No hay paradas de autobús a menos de 800 m de tu ubicación guardada.'
                                 },
  'transport.bus.nearestHeader':    { en: '🚏 Nearest {count} bus stops', fr: '🚏 {count} arrêts de bus les plus proches' ,
                                  id: '🚏 Halte bus terdekat {count}',
                                  ru: '🚏 Ближайшие {count} автобусные остановки',
                                  de: '🚏 Nächstgelegene {count} Bushaltestellen',
                                  zh: '🚏 最近的{count}个公交车站',
                                  ja: '🚏 最寄りのバス停は{count}です',
                                  es: '🚏 Paradas de autobús más cercanas: {count}'
                                },
  'transport.bus.stopMetaFirst':    { en: '🚏 Bus Stop № {code} is 📍 {dist} away from current location.', fr: '🚏 Arrêt de bus № {code} à 📍 {dist} de votre position actuelle.' ,
                                  id: '🚏 Halte Bus No. {code} berjarak 📍 {dist} dari lokasi Anda saat ini.',
                                  ru: 'Автобусная остановка № {code} находится 📍 {dist} от текущего местоположения.',
                                  de: '🚏 Bushaltestelle Nr. {code} ist 📍 {dist} von Ihrem aktuellen Standort entfernt.',
                                  zh: '🚏 公交车站 № {code}距离当前位置 📍 {dist} 。',
                                  ja: '🚏 バス停番号{code}は現在地から 📍 {dist}離れています。',
                                  es: '🚏 La parada de autobús nº {code} está a 📍 {dist} de distancia de la ubicación actual.'
                                },
  'transport.bus.stopMetaRest':     { en: '🚏 Bus Stop № {code} · 📍 {dist}', fr: '🚏 Arrêt de bus № {code} · 📍 {dist}' ,
                                 id: '🚏 Halte Bus No. {code} · 📍 {dist}',
                                 ru: '🚏 Автобусная остановка № {code} · 📍 {dist}',
                                 de: '🚏 Bushaltestelle Nr. {code} · 📍 {dist}',
                                 zh: '🚏 公交车站 № {code} · 📍 {dist}',
                                 ja: '🚏 バス停番号{code} · 📍 {dist}',
                                 es: '🚏 Parada de autobús nº {code} · 📍 {dist}'
                               },
  'transport.bus.stopRow':          { en: '· {desc} ({road}) — {dist}', fr: '· {desc} ({road}) — {dist}' ,
                            id: '· {desc} ( {road} ) — {dist}',
                            ru: '· {desc} ( {road} ) — {dist}',
                            de: '· {desc} ( {road} ) — {dist}',
                            zh: '· {desc} ( {road} ) — {dist}',
                            ja: '・{desc} （ {road} ）— {dist}',
                            es: '· {desc} ( {road} ) — {dist}'
                          },
  'transport.bus.stopCode':         { en: '  Code: {code}', fr: '  Code : {code}' ,
                             id: 'Kode: {code}',
                             ru: 'Код: {code}',
                             de: 'Code: {code}',
                             zh: '代码： {code}',
                             ja: 'コード: {code}',
                             es: 'Código: {code}'
                           },
  'transport.bus.noStopsArrivals':  { en: '⏱ No bus stops within 800 m of your saved location.', fr: '⏱ Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' ,
                                    id: '⏱ Tidak ada halte bus dalam radius 800 m dari lokasi yang Anda simpan.',
                                    ru: '⏱ В радиусе 800 м от сохраненного вами местоположения нет автобусных остановок.',
                                    de: '⏱ Keine Bushaltestellen im Umkreis von 800 m um Ihren gespeicherten Standort.',
                                    zh: '⏱ 您保存的位置附近 800 米内没有公交车站。',
                                    ja: '⏱ 保存した場所から800m以内にバス停はありません。',
                                    es: '⏱ No hay paradas de autobús a menos de 800 m de tu ubicación guardada.'
                                  },
  'transport.bus.arrivalsHeader':   { en: '⏱ Next arrivals — top 3 nearest stops', fr: '⏱ Prochains passages — 3 arrêts les plus proches' ,
                                   id: '⏱ Kedatangan berikutnya — 3 halte terdekat',
                                   ru: '⏱ Следующие прибытия — 3 ближайшие остановки',
                                   de: '⏱ Nächste Ankünfte – die 3 nächstgelegenen Haltestellen',
                                   zh: '⏱ 下一班列车 — 距离最近的 3 个站点',
                                   ja: '⏱ 次に到着する駅 — 最も近い上位3駅',
                                   es: '⏱ Próximas llegadas: las 3 paradas más cercanas'
                                 },
  'transport.bus.noLive':           { en: '  no real-time arrivals', fr: '  aucun passage en temps réel' ,
                           id: 'tidak ada kedatangan secara real-time',
                           ru: 'нет данных о прибытии в режиме реального времени',
                           de: 'keine Echtzeit-Ankünfte',
                           zh: '没有实时到达信息',
                           ja: 'リアルタイムの到着情報はありません',
                           es: 'No hay llegadas en tiempo real.'
                         },
  'transport.bus.noStopsCrowd':     { en: '👥 No bus stops within 800 m to sample.', fr: '👥 Aucun arrêt de bus à moins de 800 m à échantillonner.' ,
                                 id: '👥 Tidak ada halte bus dalam radius 800 m untuk pengambilan sampel.',
                                 ru: '👥 В радиусе 800 м нет автобусных остановок, где можно взять образцы.',
                                 de: '👥 Keine Bushaltestellen im Umkreis von 800 m, um Proben zu entnehmen.',
                                 zh: '👥 采样点附近 800 米内没有公交车站。',
                                 ja: '👥 800m以内に試飲できるバス停はありません。',
                                 es: '👥 No hay paradas de autobús a menos de 800 m para tomar muestras.'
                               },
  'transport.bus.loadHeader':       { en: '👥 Bus load — sampled across nearest 3 stops', fr: '👥 Charge des bus — échantillon des 3 arrêts proches' ,
                               id: '👥 Jumlah penumpang bus — diambil sampel dari 3 halte terdekat',
                               ru: '👥 Загруженность автобуса — выборка произведена на 3 ближайших остановках',
                               de: '👥 Busauslastung – Stichprobe an den 3 nächstgelegenen Haltestellen',
                               zh: '👥 公交车载客量 — 取自附近 3 个站点的样本数据',
                               ja: '👥 バスの乗車率 — 最寄りの3つの停留所でサンプリング',
                               es: '👥 Ocupación del autobús: muestra tomada en las 3 paradas más cercanas.'
                             },
  'transport.bus.load.seats':       { en: 'Seats Available: {n}', fr: 'Places assises : {n}' ,
                               id: 'Kursi Tersedia: {n}',
                               ru: 'Свободные места: {n}',
                               de: 'Verfügbare Plätze: {n}',
                               zh: '剩余座位： {n}',
                               ja: '空席状況： {n}',
                               es: 'Plazas disponibles: {n}'
                             },
  'transport.bus.load.standing':    { en: 'Standing Available: {n}', fr: 'Places debout : {n}' ,
                                  id: 'Tersedia tempat berdiri: {n}',
                                  ru: 'Доступно для стояния: {n}',
                                  de: 'Stehplätze verfügbar: {n}',
                                  zh: '现有可用名额： {n}',
                                  ja: '立ち見席あり： {n}',
                                  es: 'Disponibilidad de pie: {n}'
                                },
  'transport.bus.load.limited':     { en: 'Limited Standing: {n}', fr: 'Debout limité : {n}' ,
                                 id: 'Tempat Terbatas: {n}',
                                 ru: 'Ограниченный статус: {n}',
                                 de: 'Beschränkte Berechtigung: {n}',
                                 zh: '有限资格： {n}',
                                 ja: '限定的な立ち入り： {n}',
                                 es: 'Reputación limitada: {n}'
                               },
  'transport.bus.load.footer':      { en: '(of {n} services with live load data)', fr: '(sur {n} services avec données de charge en direct)' ,
                                id: '(dari {n} layanan dengan data beban langsung)',
                                ru: '(из {n} сервисов с данными о текущей нагрузке)',
                                de: '(von {n} Diensten mit Live-Lastdaten)',
                                zh: '（包含{n}具有实时负载数据的服务）',
                                ja: '（ライブ負荷データを持つ{n}個のサービスのうち）',
                                es: '(de {n} servicios con datos de carga en tiempo real)'
                              },
  'transport.bus.noLoad':           { en: 'No live load data right now — try again in 30 s.', fr: 'Aucune donnée de charge en direct — réessayez dans 30 s.' ,
                           id: 'Saat ini tidak ada data beban langsung — coba lagi dalam 30 detik.',
                           ru: 'Данные о текущей нагрузке в данный момент отсутствуют — попробуйте еще раз через 30 секунд.',
                           de: 'Derzeit liegen keine Live-Lastdaten vor – versuchen Sie es in 30 Sekunden erneut.',
                           zh: '目前没有实时负载数据——30 秒后再试。',
                           ja: '現在、リアルタイムの負荷データはありません。30秒後にもう一度お試しください。',
                           es: 'No hay datos de carga en tiempo real en este momento; inténtelo de nuevo en 30 segundos.'
                         },
  'transport.bus.routeCaption':     { en: '🗺 Tap below to open Google Maps in transit mode from your saved location. Type your destination in Maps.', fr: '🗺 Touchez ci-dessous pour ouvrir Google Maps en mode transports depuis votre position enregistrée. Tapez votre destination dans Maps.' ,
                                 id: '🗺 Ketuk di bawah untuk membuka Google Maps dalam mode transit dari lokasi yang Anda simpan. Ketik tujuan Anda di Maps.',
                                 ru: '🗺 Нажмите ниже, чтобы открыть Google Maps в режиме движения из сохраненного местоположения. Введите пункт назначения в Карты.',
                                 de: '🗺 Tippen Sie unten, um Google Maps im Transitmodus von Ihrem gespeicherten Standort aus zu öffnen. Geben Sie Ihr Ziel in Maps ein.',
                                 zh: '🗺 点击下方即可从您保存的位置打开谷歌地图的交通模式。在地图中输入您的目的地。',
                                 ja: '🗺 下のボタンをタップして、保存した場所からGoogleマップを移動モードで開きます。マップに目的地を入力してください。',
                                 es: '🗺 Pulsa abajo para abrir Google Maps en modo transporte desde tu ubicación guardada. Escribe tu destino en Maps.'
                               },
  'transport.bus.routeBtn':         { en: '🗺 Open Google Maps (transit)', fr: '🗺 Ouvrir Google Maps (transports)' ,
                             id: '🗺 Buka Google Maps (transportasi umum)',
                             ru: '🗺 Откройте Google Maps (транспорт)',
                             de: '🗺 Google Maps öffnen (ÖPNV)',
                             zh: '🗺 打开谷歌地图（公交）',
                             ja: '🗺 Googleマップ（公共交通機関）を開く',
                             es: '🗺 Abre Google Maps (transporte público)'
                           },
  'transport.bus.unreachable':      { en: 'Sorry, the bus feed is unavailable right now.', fr: 'Désolé, le flux des bus est indisponible pour le moment.' ,
                                id: 'Maaf, siaran bus saat ini tidak tersedia.',
                                ru: 'К сожалению, трансляция из автобуса в данный момент недоступна.',
                                de: 'Leider ist der Bus-Feed momentan nicht verfügbar.',
                                zh: '抱歉，目前公交信息暂不可用。',
                                ja: '申し訳ありませんが、現在バスの運行状況に関する情報はご利用いただけません。',
                                es: 'Lo sentimos, la señal del autobús no está disponible en este momento.'
                              },

  // /transport incidents
  'transport.incidents.offline':    { en: '🚦 Traffic feed offline (LTA key not configured).', fr: '🚦 Flux de circulation hors-ligne (clé LTA non configurée).' ,
                                  id: '🚦 Umpan lalu lintas offline (kunci LTA belum dikonfigurasi).',
                                  ru: '🚦 Поток трафика отключен (ключ LTA не настроен).',
                                  de: '🚦 Datenstrom offline (LTA-Schlüssel nicht konfiguriert).',
                                  zh: '🚦 流量数据离线（LTA 密钥未配置）。',
                                  ja: '🚦 交通情報フィードがオフラインです（LTAキーが設定されていません）。',
                                  es: '🚦 El flujo de tráfico está fuera de línea (la clave LTA no está configurada).'
                                },
  'transport.incidents.heading':    { en: '🚦 *Live traffic incidents*', fr: '🚦 *Incidents de circulation en direct*' ,
                                  id: '🚦 *Insiden lalu lintas langsung*',
                                  ru: '🚦 *Информация о дорожно-транспортных происшествиях в режиме реального времени*',
                                  de: '🚦 *Aktuelle Verkehrsmeldungen*',
                                  zh: '🚦 *实时交通事件*',
                                  ja: '🚦 *交通事故速報*',
                                  es: '🚦 *Incidentes de tráfico en directo*'
                                },
  // v0.60.72 — /causeway live SG ⟷ JB border camera stills.
  'transport.causeway.heading':     { en: '🛂 SG ⟷ JB checkpoint cameras', fr: '🛂 Caméras du poste-frontière SG ⟷ JB' ,
                                 id: '🛂 SG ⟷ Kamera pos pemeriksaan JB',
                                 ru: '🛂 SG ⟷ Камеры на контрольно-пропускном пункте JB',
                                 de: '🛂 SG ⟷ JB Kontrollpunktkameras',
                                 zh: '🛂 新加坡 ⟷ 新山检查站摄像头',
                                 ja: '🛂 シンガポール ⟷ ジョホールバル 検問所カメラ',
                                 es: '🛂 Cámaras de control en SG ⟷ JB'
                               },
  'transport.causeway.refreshed':   { en: '_Refreshed: {at}_', fr: '_Actualisé : {at}_' ,
                                   id: '_Diperbarui: {at} _',
                                   ru: 'Обновлено: {at}',
                                   de: 'Aktualisiert: {at}',
                                   zh: '_刷新时间： {at} _',
                                   ja: '更新日時: {at}',
                                   es: '_Actualizado: {at} _'
                                 },
  // v0.60.103 — live camera count + per-checkpoint breakdown.
  'transport.causeway.count':       { en: '_{n} cameras live ({breakdown})_', fr: '_{n} caméras en direct ({breakdown})_' ,
                               id: '_ {n} kamera siaran langsung ( {breakdown} )_',
                               ru: '_ {n} камеры в прямом эфире ( {breakdown} )_',
                               de: '_ {n} Kameras live ( {breakdown} )_',
                               zh: '_ {n}个摄像头实时（ {breakdown} ）_',
                               ja: '_ {n}のカメラがライブ配信中（ {breakdown} ）_',
                               es: '_ {n} cámaras en directo ( {breakdown} )_'
                             },
  'transport.causeway.empty':       { en: 'LTA returned no checkpoint cameras right now — try again in a minute.',
                                      fr: 'LTA n’a renvoyé aucune caméra de poste-frontière — réessayez dans une minute.' ,
                               id: 'LTA tidak menemukan kamera pos pemeriksaan saat ini — coba lagi dalam satu menit.',
                               ru: 'На данный момент LTA не обнаружила ни одной записи с камер видеонаблюдения — попробуйте еще раз через минуту.',
                               de: 'Die LTA hat im Moment keine Kontrollpunktkameras gemeldet – versuchen Sie es in einer Minute erneut.',
                               zh: 'LTA目前没有返回任何检查站摄像头画面——请稍后再试。',
                               ja: 'LTAは現在、検問所のカメラを検出していません。1分後にもう一度お試しください。',
                               es: 'La LTA no ha detectado ninguna cámara en los puntos de control en este momento; inténtelo de nuevo en un minuto.'
                             },
  'transport.causeway.unreachable': { en: '🛂 Couldn’t reach LTA for checkpoint cameras — try again in a minute.',
                                      fr: '🛂 Impossible de joindre LTA pour les caméras de poste-frontière — réessayez dans une minute.' ,
                                     id: '🛂 Tidak dapat terhubung dengan LTA untuk kamera pos pemeriksaan — coba lagi dalam satu menit.',
                                     ru: '🛂 Не удалось связаться с LTA по поводу камер на контрольно-пропускных пунктах — попробуйте еще раз через минуту.',
                                     de: '🛂 LTA konnte bezüglich der Kontrollpunktkameras nicht erreicht werden – bitte versuchen Sie es in einer Minute erneut.',
                                     zh: '🛂 无法联系陆路交通管理局获取检查站摄像头信息——请稍后再试。',
                                     ja: '🛂 チェックポイントカメラについてLTAに接続できませんでした。1分後にもう一度お試しください。',
                                     es: '🛂 No se pudo contactar con LTA para obtener información sobre las cámaras de control; inténtelo de nuevo en un minuto.'
                                   },
  'transport.incidents.none':       { en: 'No live incidents reported.', fr: 'Aucun incident en direct signalé.' ,
                               id: 'Tidak ada insiden langsung yang dilaporkan.',
                               ru: 'Сообщений о происшествиях в режиме реального времени не поступало.',
                               de: 'Es wurden keine Zwischenfälle gemeldet.',
                               zh: '未报告任何现场事故。',
                               ja: '現在発生している事件は報告されていません。',
                               es: 'No se han reportado incidentes en directo.'
                             },
  // v0.60.103 — uncapped: show every island-wide incident, sorted
  // nearest-first when location is shared.
  'transport.incidents.nearHeader': { en: 'Latest {n} traffic incidents island-wide:', fr: 'Derniers {n} incidents de circulation à l’échelle de l’île :' ,
                                     id: 'Insiden lalu lintas {n} di seluruh pulau:',
                                     ru: 'Последние {n} дорожно-транспортные происшествия по всему острову:',
                                     de: 'Aktuelle {n} Verkehrsvorfälle inselweit:',
                                     zh: '全岛最新{n}起交通事故：',
                                     ja: '島全体で発生した最新の{n}の交通事故：',
                                     es: 'Últimos {n} incidentes de tráfico en toda la isla:'
                                   },
  'transport.incidents.row':        { en: '· {type}{dist}', fr: '· {type}{dist}' ,
                              id: '· {type} {dist}',
                              ru: '· {type} {dist}',
                              de: '· {type} {dist}',
                              zh: '· {type} {dist}',
                              ja: '・{type} {dist}',
                              es: '· {type} {dist}'
                            },
  'transport.incidents.noNear':     { en: '{total} incidents island-wide; none within 20 km of your location.', fr: '{total} incidents dans tout le pays ; aucun à moins de 20 km de votre position.' ,
                                 id: '{total} insiden di seluruh pulau; tidak ada dalam radius 20 km dari lokasi Anda.',
                                 ru: '{total} инцидентов по всему острову; ни одного в радиусе 20 км от вашего местоположения.',
                                 de: '{total} Vorfälle inselweit; keiner im Umkreis von 20 km um Ihren Standort.',
                                 zh: '全岛共发生{total}起事件；您所在位置 20 公里范围内没有发生事件。',
                                 ja: '島全体で{total}の事件が発生しました。あなたの現在地から20km圏内では発生していません。',
                                 es: '{total} incidentes en toda la isla; ninguno en un radio de 20 km de su ubicación.'
                               },
  'transport.incidents.noLoc':      { en: '{total} incidents island-wide. Share your location for nearest-first sorting.', fr: '{total} incidents dans tout le pays. Partagez votre position pour un tri par proximité.' ,
                                id: '{total} insiden di seluruh pulau. Bagikan lokasi Anda untuk pengurutan terdekat terlebih dahulu.',
                                ru: '{total} инцидентов по всему острову. Укажите ваше местоположение для сортировки по ближайшему списку.',
                                de: '{total} Vorfälle inselweit. Teilen Sie Ihren Standort, damit die Ergebnisse nach Nähe sortiert werden können.',
                                zh: '全岛共发生{total}起事件。请分享您的位置，以便我们优先显示距离最近的事件。',
                                ja: '島全体で{total}件の事件が発生しました。現在地を共有していただくと、最寄りの事件を優先的に表示します。',
                                es: '{total} incidentes en toda la isla. Comparta su ubicación para que se ordene por proximidad.'
                              },
  'transport.incidents.unreachable':{ en: 'Sorry, the traffic feed failed.', fr: 'Désolé, le flux de circulation a échoué.' ,
                                      id: 'Maaf, umpan lalu lintas mengalami kegagalan.',
                                      ru: 'Извините, передача данных о дорожной ситуации не удалась.',
                                      de: 'Leider ist der Verkehrsdaten-Feed ausgefallen.',
                                      zh: '抱歉，交通信息流传输失败。',
                                      ja: '申し訳ありませんが、交通情報フィードの取得に失敗しました。',
                                      es: 'Lo sentimos, la transmisión de tráfico falló.'
                                    },

  // /transport drive
  'transport.drive.title':          { en: '🚗 Drive', fr: '🚗 Voiture' ,
                            id: '🚗 Mengemudi',
                            ru: '🚗 Вождение',
                            de: '🚗 Fahren',
                            zh: '🚗 驾车',
                            ja: '🚗 ドライブ',
                            es: '🚗 Conducir'
                          },
  'transport.drive.trafficNear':    { en: '🚦 Traffic (top {n} of {total} island-wide):', fr: '🚦 Circulation (top {n} sur {total} dans tout le pays) :' ,
                                  id: '🚦 Lalu lintas (tertinggi {n} dari {total} di seluruh pulau):',
                                  ru: '🚦 Трафик (верхний {n} из {total} по всему острову):',
                                  de: '🚦 Verkehr (Top {n} von {total} inselweit):',
                                  zh: '🚦 交通流量（全岛前{n}条，共{total}条）：',
                                  ja: '🚦 交通量（島全体の{total}のうち上位{n}件）：',
                                  es: '🚦 Tráfico (los {n} principales del total de {total} en toda la isla):'
                                },
  'transport.drive.trafficNoNear':  { en: '🚦 Traffic: {total} incidents island-wide; none within 5 km.', fr: '🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km.' ,
                                    id: '🚦 Lalu lintas: {total} insiden di seluruh pulau; tidak ada dalam radius 5 km.',
                                    ru: '🚦 Дорожная ситуация: {total} инцидентов по всему острову; ни одного в радиусе 5 км.',
                                    de: '🚦 Verkehr: {total} Vorfälle inselweit; keine im Umkreis von 5 km.',
                                    zh: '🚦 交通：全岛共发生{total}起事件；5 公里范围内无事件发生。',
                                    ja: '🚦 交通: 島全体で{total}の事故。5km圏内ではなし。',
                                    es: '🚦 Tráfico: {total} incidentes en toda la isla; ninguno en un radio de 5 km.'
                                  },
  'transport.drive.trafficNone':    { en: '🚦 Traffic: no live incidents reported.', fr: '🚦 Circulation : aucun incident en direct signalé.' ,
                                  id: '🚦 Lalu lintas: tidak ada insiden langsung yang dilaporkan.',
                                  ru: '🚦 Информация о дорожно-транспортных происшествиях отсутствует.',
                                  de: '🚦 Verkehr: Keine aktuellen Zwischenfälle gemeldet.',
                                  zh: '🚦 交通：未报告任何实时事件。',
                                  ja: '🚦 交通情報：現在発生している事故は報告されていません。',
                                  es: '🚦 Tráfico: no se han reportado incidentes en directo.'
                                },
  'transport.drive.openMapsBtn':    { en: 'Google Map ↗', fr: 'Google Map ↗' ,
                                  id: 'Peta Google ↗',
                                  ru: 'Карта Google ↗',
                                  de: 'Google Maps ↗',
                                  zh: '谷歌地图 ↗',
                                  ja: 'Googleマップ↗',
                                  es: 'Mapa de Google ↗'
                                },
  'transport.drive.noLocation':     { en: 'Share your location once and Soleat will offer a one-tap driving directions link.', fr: 'Partagez votre position une fois et Soleat proposera un lien d’itinéraire en voiture en un clic.' ,
                                 id: 'Bagikan lokasi Anda sekali saja dan Soleat akan menawarkan tautan petunjuk arah berkendara hanya dengan sekali klik.',
                                 ru: 'Укажите свое местоположение один раз, и Soleat предложит вам ссылку для построения маршрута одним касанием.',
                                 de: 'Teilen Sie Ihren Standort einmal mit, und Soleat bietet Ihnen einen Link zur Wegbeschreibung mit nur einem Klick.',
                                 zh: '只需分享一次您的位置，Soleat 就会提供一键式驾车路线链接。',
                                 ja: '一度位置情報を共有すれば、Soleatはワンタップでアクセスできる運転ルート案内リンクを提供します。',
                                 es: 'Comparte tu ubicación una sola vez y Soleat te ofrecerá un enlace con indicaciones para llegar en coche con un solo toque.'
                               },
  'transport.drive.btn.carpark':    { en: '🅿️ Carpark', fr: '🅿️ Parking' ,
                                  id: '🅿️ Parkir Mobil',
                                  ru: 'Парковка 🅿️',
                                  de: '🅿️ Parkplatz',
                                  zh: '停车场',
                                  ja: '駐車場',
                                  es: 'Aparcamiento 🅿️'
                                },
  'transport.drive.unreachable':    { en: 'Sorry, the drive view failed.', fr: 'Désolé, la vue voiture a échoué.' ,
                                  id: 'Maaf, tampilan drive gagal.',
                                  ru: 'Извините, отображение диска не удалось.',
                                  de: 'Die Laufwerksansicht konnte leider nicht aufgerufen werden.',
                                  zh: '抱歉，驱动器视图失败。',
                                  ja: '申し訳ありませんが、ドライブビューに失敗しました。',
                                  es: 'Lo sentimos, la vista de la unidad falló.'
                                },

  // /forgetme
  'forgetme.nothing':          { en: '✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.)', fr: '✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.)' ,
                       id: '✅ Tidak ada yang perlu dihapus — Saya tidak memiliki data yang tersimpan untuk Anda. (Cache dan baris permintaan akan kedaluwarsa secara otomatis; semua slot persisten kosong.)',
                       ru: '✅ Удалять нечего — у меня не было сохраненных данных о вас. (Кэш и строки запросов автоматически удаляются; все постоянные слоты оказались пустыми.)',
                       de: '✅ Nichts zu löschen – ich hatte keine gespeicherten Daten für Sie. (Caches und Anforderungszeilen laufen automatisch ab; die persistenten Speicherplätze waren alle leer.)',
                       zh: '✅ 无需删除任何数据——我没有存储任何关于您的数据。（缓存和请求行会自动过期；持久化存储槽均为空。）',
                       ja: '✅ 消去するものはありません — お客様のために保存されたデータはありませんでした。（キャッシュとリクエスト行は自動的に期限切れになります。永続スロットはすべて空でした。）',
                       es: '✅ No hay nada que borrar: no tenía datos almacenados para usted. (Las cachés y las filas de solicitudes caducan automáticamente; todos los espacios persistentes estaban vacíos).'
                     },
  'forgetme.eraseHeader':      { en: '✅ Erased *{n}* Redis entry for your chat.', fr: '✅ {n} entrée Redis effacée pour votre conversation.' ,
                           id: '✅ Entri Redis * {n} * dihapus untuk obrolan Anda.',
                           ru: '✅ Удалена запись * {n} * в Redis для вашего чата.',
                           de: '✅ Gelöschter * {n} * Redis-Eintrag für Ihren Chat.',
                           zh: '✅ 已删除您的聊天记录的{n}条目。',
                           ja: '✅ チャット用の * {n} * Redis エントリを削除しました。',
                           es: '✅ Eliminada * {n} * Entrada de Redis para tu chat.'
                         },
  'forgetme.eraseHeaderMany':  { en: '✅ Erased *{n}* Redis entries for your chat.', fr: '✅ {n} entrées Redis effacées pour votre conversation.' ,
                               id: '✅ Entri Redis * {n} * dihapus untuk obrolan Anda.',
                               ru: '✅ Удалены * {n} * записи Redis для вашего чата.',
                               de: '✅ Gelöschte * {n} * Redis-Einträge für Ihren Chat.',
                               zh: '✅ 已删除 * {n} * 条 Redis 聊天记录。',
                               ja: '✅ チャットの Redis エントリを * {n} * 削除しました。',
                               es: '✅ Se borraron * {n} * entradas de Redis para tu chat.'
                             },
  'forgetme.wiped':            { en: 'Wiped:', fr: 'Effacé :' ,
                     id: 'Dihapus:',
                     ru: 'Удалено:',
                     de: 'Gelöscht:',
                     zh: '已擦除：',
                     ja: '消去済み:',
                     es: 'Borrado:'
                   },
  'forgetme.andMore':          { en: '…and {n} more', fr: '…et {n} autres' ,
                       id: '…dan {n} lainnya',
                       ru: '…и {n} ещё',
                       de: '…und {n} weitere',
                       zh: '……以及{n}',
                       ja: '…そしてさらに{n}',
                       es: '…y {n} más'
                     },
  'forgetme.followup':         { en: 'Send any command to start fresh. Recent picks and your last shared location are gone.', fr: 'Envoyez n’importe quelle commande pour repartir à neuf. Vos choix récents et votre dernière position partagée ont été effacés.' ,
                        id: 'Kirim perintah apa pun untuk memulai dari awal. Pilihan terbaru dan lokasi terakhir yang Anda bagikan akan hilang.',
                        ru: 'Отправьте любую команду, чтобы начать заново. Недавние выбранные вами объекты и последнее совместно использованное местоположение будут удалены.',
                        de: 'Senden Sie einen beliebigen Befehl, um von vorne zu beginnen. Ihre letzten Auswahlen und Ihr zuletzt geteilter Standort gehen verloren.',
                        zh: '发送任意命令即可重新开始。最近的选择和上次分享的位置都将被清除。',
                        ja: '最初からやり直すには、任意のコマンドを送信してください。最近撮影した写真と最後に共有した場所の情報はすべて削除されます。',
                        es: 'Envía cualquier comando para empezar de cero. Tus selecciones recientes y tu última ubicación compartida se han eliminado.'
                      },
  'forgetme.error':            { en: 'Sorry, /forgetme hit an error. Try again in a moment, or DM the operator.', fr: 'Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur.' ,
                     id: 'Maaf, /forgetme mengalami kesalahan. Coba lagi sebentar lagi, atau kirim pesan pribadi ke operator.',
                     ru: 'Извините, команда /forgetme выдала ошибку. Попробуйте еще раз через минуту или напишите оператору в личные сообщения.',
                     de: 'Entschuldigung, /forgetme ist auf einen Fehler gestoßen. Versuchen Sie es gleich erneut oder kontaktieren Sie den Betreiber per Direktnachricht.',
                     es: 'Lo sentimos, /forgetme ha dado un error. Inténtalo de nuevo en un momento o envía un mensaje directo al operador.'
                   ,
                     zh: '抱歉， /forgetme 出错了。请稍后再试，或私信客服。',
                     ja: '申し訳ありません、 /forgetme でエラーが発生しました。しばらくしてからもう一度お試しいただくか、オペレーターにDMを送ってください。'
                   },

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
  'language.btn.en':           { en: '🇬🇧 English', fr: '🇬🇧 English' ,
                      id: 'Bahasa Inggris 🇬🇧',
                      ru: '🇬🇧 Английский',
                      de: '🇬🇧 Englisch',
                      zh: '🇬🇧 英语',
                      ja: '🇬🇧 英語',
                      es: 'Inglés 🇬🇧'
                    },
  'language.btn.fr':           { en: '🇫🇷 Français', fr: '🇫🇷 Français' ,
                      id: '🇫🇷 Français',
                      ru: '🇫🇷 Français',
                      de: '🇫🇷 Französisch',
                      zh: '🇫🇷 法语',
                      ja: '🇫🇷 Français',
                      es: '🇫🇷 Français'
                    },
  // v0.62.480 — flag + endonym (native name) so a speaker recognises their
  // own language whatever the prompt locale. Same string in both en/fr keys.
  'language.btn.id':           { en: '🇮🇩 Indonesia', fr: '🇮🇩 Indonesia' ,
                      id: '🇮🇩 Indonesia',
                      ru: '🇮🇩 Индонезия',
                      de: '🇮🇩 Indonesien',
                      zh: '🇮🇩 印度尼西亚',
                      ja: '🇮🇩 インドネシア',
                      es: '🇮🇩 Indonesia'
                    },
  'language.btn.ru':           { en: '🇷🇺 Русский', fr: '🇷🇺 Русский' ,
                      id: '🇷🇺 Русский',
                      ru: '🇷🇺 Русский',
                      de: '🇷🇺 Русский',
                      zh: '🇷🇺 Русский',
                      ja: '🇷🇺 Русский',
                      es: '🇷🇺 Русский'
                    },
  'language.btn.de':           { en: '🇩🇪 Deutsch', fr: '🇩🇪 Deutsch' ,
                      id: '🇩🇪 Jerman',
                      ru: '🇩🇪 Deutsch',
                      de: '🇩🇪 Deutsch',
                      zh: '🇩🇪 德语',
                      ja: '🇩🇪 ドイツ語',
                      es: '🇩🇪 Alemán'
                    },
  'language.btn.zh':           { en: '🇨🇳 中文', fr: '🇨🇳 中文' ,
                      id: 'CNY 中文',
                      ru: '🇨🇳 中文',
                      de: '🇨🇳 中文',
                      zh: '🇨🇳 中文',
                      ja: '🇨🇳 中文',
                      es: '🇨🇳 中文'
                    },
  'language.btn.ja':           { en: '🇯🇵 日本語', fr: '🇯🇵 日本語' ,
                      id: '🇯ppa 日本語',
                      ru: '🇯🇵 日本語',
                      de: '🇯🇵 日本語',
                      zh: '🇯🇵 日本语',
                      ja: '🇯🇵 日本語',
                      es: '🇯🇵 日本語'
                    },
  'language.btn.es':           { en: '🇪🇸 Español', fr: '🇪🇸 Español' ,
                      id: '🇪🇸 Español',
                      ru: '🇪🇸 Español',
                      de: '🇪🇸 Español',
                      zh: '🇪🇸 西班牙语',
                      ja: '🇪🇸 スペイン語',
                      es: '🇪🇸 Español'
                    },

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
  'location.shareTap':         { en: '📍 Tap to share your current location.', fr: '📍 Touchez pour partager votre position actuelle.' ,
                        id: '📍 Ketuk untuk membagikan lokasi Anda saat ini.',
                        ru: '📍 Нажмите, чтобы поделиться своим текущим местоположением.',
                        de: '📍 Tippe hier, um deinen aktuellen Standort zu teilen.',
                        zh: '📍点击分享您的当前位置。',
                        ja: '📍 現在地を共有するにはタップしてください。',
                        es: '📍 Toca para compartir tu ubicación actual.'
                      },
  'location.got':              { en: '📍 Got your location.', fr: '📍 Position reçue.' ,
                   id: '📍 Lokasi Anda sudah diketahui.',
                   ru: '📍 Ваше местоположение определено.',
                   de: '📍 Wir haben Ihren Standort ermittelt.',
                   zh: '📍已获取您的位置。',
                   ja: '📍現在地を取得しました。',
                   es: '📍 Tenemos tu ubicación.'
                 },
  // v0.62.3 — first-share confirmation + desktop nudge. Telegram Desktop has
  // no GPS: its "share" button is a map-pick that defaults to an IP/last point
  // (operator: a first-load share on Mac stuck to "Muzium Negara, KL"). On the
  // FIRST ever share we confirm the resolved place + offer a manual-set path.
  'loc.confirm.firstShare':    { en: '📍 *Location set to:*\n{place}\n\n💻 On desktop, Telegram shares a *map-pinned point*, not live GPS — it can land on the wrong spot. Is this where you are?',
                                 fr: '📍 *Position définie sur :*\n{place}\n\n💻 Sur ordinateur, Telegram partage un *point sur la carte*, pas le GPS — cela peut tomber au mauvais endroit. Est-ce bien là que vous êtes ?' ,
                             id: '📍 *Lokasi diatur ke:*\n{place}\n\n💻 Di desktop, Telegram membagikan *titik yang ditandai di peta*, bukan GPS langsung — bisa saja menunjukkan lokasi yang salah. Apakah ini lokasi Anda?',
                             ru: '📍 *Местоположение установлено следующим образом:*\n{place}\n\n💻 На компьютере Telegram отображает *отмеченную на карте точку*, а не данные GPS в реальном времени — она может оказаться не в том месте. Вы находитесь в этом месте?',
                             de: '📍 *Standort eingestellt auf:*\n{place}\n\n💻 Auf dem Desktop zeigt Telegram einen *gepinnten Punkt* auf einer Karte an, nicht das Live-GPS – es kann also vorkommen, dass der falsche Ort angezeigt wird. Befindest du dich hier?',
                             zh: '📍 *位置已设置为：*\n{place}\n\n💻 在电脑端，Telegram 分享的是地图上的标记点，而不是实时 GPS 定位——因此可能会定位到错误的位置。这是你所在的位置吗？',
                             ja: '📍 *位置情報設定:*\n{place}\n\n💻 デスクトップ版の Telegram では、リアルタイムの GPS ではなく、*地図上にピン留めされた地点* が共有されます。そのため、間違った場所に表示される可能性があります。ここがあなたの現在地ですか?',
                             es: '📍 *Ubicación establecida en:*\n{place}\n\n💻 En la versión de escritorio, Telegram comparte un *punto marcado en el mapa*, no un GPS en tiempo real; puede ubicarse en un lugar incorrecto. ¿Estás ahí?'
                           },
  'loc.confirm.yes':           { en: '✅ Yes, use it', fr: '✅ Oui, utiliser' ,
                      id: '✅ Ya, gunakanlah',
                      ru: '✅ Да, используйте его',
                      de: '✅ Ja, benutze es.',
                      zh: '✅ 是的，请使用它',
                      ja: '✅ はい、使ってください',
                      es: '✅ Sí, úsalo'
                    },
  'loc.confirm.no':            { en: '✏️ No, set manually', fr: '✏️ Non, saisir manuellement' ,
                     id: '✏️ Tidak, atur secara manual',
                     ru: '✏️ Нет, установить вручную',
                     de: '✏️ Nein, manuell einstellen',
                     zh: '✏️ 不，手动设置',
                     ja: '✏️ いいえ、手動で設定してください',
                     es: '✏️ No, configurar manualmente'
                   },
  'loc.confirm.okAck':         { en: '📍 *Confirmed:* {place}', fr: '📍 *Confirmé :* {place}' ,
                        id: '📍 *Dikonfirmasi:* {place}',
                        ru: '📍 *Подтверждено:* {place}',
                        de: '📍 *Bestätigt:* {place}',
                        zh: '📍 *已确认：* {place}',
                        ja: '📍 *確認済み:* {place}',
                        es: '📍 *Confirmado:* {place}'
                      },
  'loc.confirm.fixPrompt':     { en: 'Type your area — e.g. `/l Orchard Road` or `/l Bugis`. On desktop, typing is more reliable than the share button.',
                                 fr: 'Saisissez votre lieu — p. ex. `/l Orchard Road` ou `/l Bugis`. Sur ordinateur, taper est plus fiable que le bouton de partage.' ,
                            id: 'Ketik area Anda — misalnya `/l Orchard Road` atau `/l Bugis` . Di desktop, mengetik lebih andal daripada tombol berbagi.',
                            ru: 'Введите название вашего района — например `/l Orchard Road` или `/l Bugis` . На компьютере ввод текста более надежен, чем использование кнопки «Поделиться».',
                            de: 'Geben Sie Ihren Ort ein – z. B. `/l Orchard Road` oder `/l Bugis` . Auf dem Desktop ist die Eingabe zuverlässiger als die Teilen-Schaltfläche.',
                            zh: '输入您的区域，例如`/l Orchard Road`或`/l Bugis` 。在电脑上，打字比使用分享按钮更可靠。',
                            ja: '地域名を入力してください（例： `/l Orchard Road`または`/l Bugis` ）。デスクトップでは、共有ボタンよりも入力の方が確実です。',
                            es: 'Escribe tu zona; por ejemplo `/l Orchard Road` o `/l Bugis` . En ordenadores de sobremesa, escribir es más fiable que usar el botón de compartir.'
                          },
  'loc.desktopNudge':          { en: '💻 On desktop? Telegram shares a map-pick, not GPS. If this is wrong, type /l <your area>.',
                       fr: '💻 Sur ordinateur ? Telegram partage un point sur carte, pas le GPS. Si c’est faux, tapez /l <votre lieu>.',
                       de: '💻 Auf dem Desktop? Telegram teilt eine Kartenposition, nicht GPS. Falls dies nicht zutrifft, gib /l ein.<your area> Die' },
  // v0.59.6: ensureLocation prompts (the "two messages" /hidden bug).
  'location.shareLabel':       { en: '📍 Share your location once so {label} uses your locale (or type `/location <place name>` to set it manually).',
                          fr: '📍 Partagez votre position une fois pour que {label} utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).',
                          de: '📍 Teile deinen Standort einmalig, damit {label} deine Region verwendet (oder gib `/location <place name>` ein, um ihn manuell festzulegen).',
                          zh: '📍 分享一次您的位置，以便 {label} 使用您的语言环境（或输入 `/location <place name>` 手动设置）。',
                          ja: '📍 一度位置情報を共有すると、 {label} であなたの地域設定が使用されます（または、 `/location <place name>` を入力して手動で設定します）。' },
  'location.current':          { en: '📍 Current: {addr}{age}', fr: '📍 Actuel : {addr}{age}' ,
                       id: '📍 Alamat saat ini: {addr} {age}',
                       ru: '📍 Текущий адрес: {addr} {age}',
                       de: '📍 Aktuell: {addr} {age}',
                       zh: '📍 当前地址： {addr} {age}',
                       ja: '📍 現在地: {addr} {age}',
                       es: '📍 Actual: {addr} {age}'
                     },
  'location.age.justShared':   { en: ' (just shared)', fr: ' (à l’instant)' ,
                              id: '(baru saja dibagikan)',
                              ru: '(Только что поделились)',
                              de: '(gerade geteilt)',
                              zh: '（刚刚分享）',
                              ja: '（共有したばかり）',
                              es: '(recién compartido)'
                            },
  'location.age.minAgo':       { en: ' ({n} min ago)', fr: ' (il y a {n} min)' ,
                          id: '( {n} menit yang lalu)',
                          ru: '( {n} минут назад)',
                          de: '(vor {n} Minuten)',
                          zh: '（ {n}分钟前）',
                          ja: '( {n}分前)',
                          es: '(hace {n} minutos)'
                        },
  'location.age.hourAgo':      { en: ' ({h} h {m} min ago)', fr: ' (il y a {h} h {m} min)' ,
                           id: '( {h} h {m} menit yang lalu)',
                           ru: '( {h} ч {m} мин назад)',
                           de: '( {h} h {m} min ago)',
                           zh: '（ {h}小时{m}分钟前）',
                           ja: '( {h}時間{m}分前)',
                           es: '( {h} h {m} minutos)'
                         },

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
                                 fr: '👋 Content de vous revoir ! Soleat utilise toujours la position que vous avez partagée. Y êtes-vous toujours, ou souhaitez-vous en définir une nouvelle ?' ,
                         id: '👋 Selamat datang kembali! Soleat masih menggunakan lokasi yang Anda bagikan sebelumnya. Apakah Anda masih di sana, atau ingin mengatur lokasi baru?',
                         ru: '👋 С возвращением! Soleat по-прежнему использует местоположение, которое вы указали ранее. Вы всё ещё здесь, или хотите указать новое?',
                         de: '👋 Willkommen zurück! Soleat verwendet immer noch den Standort, den Sie vorhin angegeben haben. Sind Sie noch dort oder möchten Sie einen neuen Standort festlegen?',
                         zh: '👋 欢迎回来！Soleat 仍然使用您之前分享的位置。您还在吗？还是想设置一个新的位置？',
                         ja: '👋 おかえりなさい！Soleatは以前共有していただいた位置情報をまだ使用しています。まだそこにいらっしゃいますか？それとも新しい位置情報を設定しますか？',
                         es: '👋 ¡Bienvenido de nuevo! Soleat sigue usando la ubicación que compartiste anteriormente. ¿Sigues ahí o prefieres configurar una nueva?'
                       },
  'wake.keepBtn':              { en: '✅ Stay here', fr: '✅ Rester ici' ,
                   id: '✅ Tetap di sini',
                   ru: '✅ Оставайтесь здесь',
                   de: '✅ Hier bleiben',
                   zh: '✅ 留在这里',
                   ja: '✅ ここに滞在してください',
                   es: '✅ Quédate aquí'
                 },
  'wake.newBtn':               { en: '📍 New location', fr: '📍 Nouvelle position' ,
                  id: '📍 Lokasi baru',
                  ru: '📍 Новое местоположение',
                  de: '📍 Neuer Standort',
                  zh: '📍 新地点',
                  ja: '📍新店舗',
                  es: '📍 Nueva ubicación'
                },
  'wake.kept':                 { en: '👍 Keeping your saved location.', fr: '👍 Position enregistrée conservée.' ,
                id: '👍 Menyimpan lokasi Anda.',
                ru: '👍 Сохранение вашего местоположения.',
                de: '👍 Dein gespeicherter Standort bleibt erhalten.',
                zh: '👍 保存您的位置。',
                ja: '👍 保存した位置情報を保持します。',
                es: '👍 Conservando tu ubicación guardada.'
              },
  // v0.61.140 — wake-from-idle 2-step flow (operator rewrite). The
  // wake message asks for a fresh GPS share via request_location;
  // the next bot.on('location') sees the wake:pending flag and runs
  // handleWakeLocationResponse, which sends `wake2.body` (HTML
  // parse_mode) with 3 inline buttons + a /l helper-text line.
  // `wake2.body` substitutes {deviceStreet} (reverse-geocoded from
  // the just-shared GPS) + {anchor} (the v0.61.139 street/building/
  // postal composite, or the legacy curated label).
  'wake.intro':                { en: '👋 Welcome back to Soleat. Share your current location so Soleat can compare with your saved search anchor.',
                                 fr: '👋 Content de vous revoir sur Soleat. Partagez votre position actuelle pour comparer avec votre point de recherche enregistré.' ,
                 id: '👋 Selamat datang kembali di Soleat. Bagikan lokasi Anda saat ini agar Soleat dapat membandingkannya dengan lokasi pencarian yang telah Anda simpan.',
                 ru: '👋 Добро пожаловать обратно в Soleat. Укажите ваше текущее местоположение, чтобы Soleat мог сравнить его с сохраненным вами якорем поиска.',
                 de: '👋 Willkommen zurück bei Soleat. Teilen Sie Ihren aktuellen Standort, damit Soleat ihn mit Ihrem gespeicherten Suchanker vergleichen kann.',
                 zh: '👋 欢迎回到Soleat。请分享您当前的位置，以便Soleat可以与您保存的搜索锚点进行比较。',
                 ja: '👋 Soleatへようこそ。現在地を共有していただくと、Soleatが保存済みの検索アンカーと比較できます。',
                 es: '👋 Bienvenido de nuevo a Soleat. Comparte tu ubicación actual para que Soleat pueda compararla con tu ancla de búsqueda guardada.'
               },
  'wake2.body':                { en: '👋 <b>Welcome back to Soleat</b>\n\nYour device now appears to be near: <i>{deviceStreet}</i>\n\nSoleat is still using your saved search anchor:\n<b>{anchor}</b>\n\nContinue searching from the anchor, or update to your current location?\n\n<i>You can also type /l to search from another place, for example:\n/l Orchard Road\n/l IOI City Mall</i>',
                                 fr: '👋 <b>Content de vous revoir sur Soleat</b>\n\nVotre appareil semble être près de : <i>{deviceStreet}</i>\n\nSoleat utilise toujours votre point de recherche enregistré :\n<b>{anchor}</b>\n\nContinuer depuis ce point, ou utiliser votre position actuelle ?\n\n<i>Vous pouvez aussi taper /l pour chercher depuis un autre lieu, par exemple :\n/l Orchard Road\n/l IOI City Mall</i>' ,
                 ru: '👋 <b>Добро пожаловать обратно в Soleat</b>\n\nВаше устройство, похоже, находится рядом с: <i> {deviceStreet} </i>\n\nSoleat по-прежнему использует сохраненный вами якорь поиска:\n<b> {anchor} </b>\n\nПродолжить поиск с указанной точки или обновить данные, указав текущее местоположение?\n\n<i>Вы также можете ввести /l для поиска из другого места, например:\n/l Орчард Роуд\n/l Торговый центр IOI City Mall</i>',
                 de: '👋 <b>Willkommen zurück bei Soleat</b>\n\nIhr Gerät befindet sich nun in der Nähe von: <i> {deviceStreet} </i>\n\nSoleat verwendet weiterhin Ihren gespeicherten Suchanker:\n<b> {anchor} </b>\n\nSuche vom Ausgangspunkt aus fortsetzen oder zu Ihrem aktuellen Standort wechseln?\n\n<i>Sie können auch /l eingeben, um von einem anderen Ort aus zu suchen, zum Beispiel:\n/l Orchard Road\n/l IOI City Mall</i>',
                 zh: '👋 <b>欢迎回到索莱特</b>\n\n您的设备现在似乎位于： <i> {deviceStreet} </i>\n\nSoleat 仍在使用您保存的搜索锚点：\n<b> {anchor} </b>\n\n继续从锚点搜索，还是更新到您当前的位置？\n\n<i>您也可以输入 /l 从其他位置进行搜索，例如：\n/l 乌节路\n/l IOI城市购物中心</i>',
                 ja: '👋 <b>ソリアットへようこそ</b>\n\nお使いのデバイスは現在、 <i> {deviceStreet} </i>付近にあります。\n\nSoleatは、保存済みの検索アンカーをまだ使用しています。\n<b> {anchor} </b>\n\nアンカー地点から検索を続けるか、現在地へ更新するか？\n\n<i>また、 /l と入力して別の場所から検索することもできます。例:\n/l オーチャードロード\n/l IOIシティモール</i>',
                 es: '👋 <b>Bienvenido de nuevo a Soleat</b>\n\nTu dispositivo ahora parece estar cerca de: <i> {deviceStreet} </i>\n\nSoleat sigue utilizando el ancla de búsqueda guardada:\n<b> {anchor} </b>\n\n¿Continuar la búsqueda desde el ancla o actualizar a su ubicación actual?\n\n<i>También puedes escribir /l para buscar desde otro lugar, por ejemplo:\n/l Orchard Road\n/l IOI City Mall</i>'
               },
  'wake2.btnCurrent':          { en: '📍 Use current location', fr: '📍 Position actuelle' ,
                       id: '📍 Gunakan lokasi saat ini',
                       ru: '📍 Укажите текущее местоположение',
                       de: '📍 Aktuellen Standort verwenden',
                       zh: '📍 使用当前位置',
                       ja: '📍 現在地を使用',
                       es: '📍 Usar ubicación actual'
                     },
  'wake2.btnKeep':             { en: '✅ Keep earlier location', fr: '✅ Garder le précédent' ,
                    id: '✅ Pertahankan lokasi sebelumnya',
                    ru: '✅ Сохраните предыдущее местоположение',
                    de: '✅ Früheren Standort beibehalten',
                    zh: '✅ 保留先前的位置',
                    ja: '✅ 以前の場所を保持する',
                    es: '✅ Mantén la ubicación anterior'
                  },
  'wake2.btnAnother':          { en: '🗺 Set another location', fr: '🗺 Définir un autre lieu' ,
                       id: '🗺 Tetapkan lokasi lain',
                       ru: '🗺 Укажите другое местоположение',
                       de: '🗺 Einen anderen Standort festlegen',
                       zh: '🗺 设置其他位置',
                       ja: '🗺別の場所を設定する',
                       es: '🗺 Establecer otra ubicación'
                     },
  'wake2.currentApplied':      { en: '👍 Anchor updated to <i>{street}</i>.', fr: '👍 Point mis à jour vers <i>{street}</i>.' ,
                           id: '👍 Jangkar diperbarui menjadi <i>{street}</i> .',
                           ru: '👍 Якорь обновлен до <i>{street}</i> .',
                           de: '👍 Anchor aktualisiert auf <i>{street}</i> .',
                           zh: '👍 锚点已更新<i>{street}</i> 。',
                           ja: '👍 アンカーが更新されました<i>{street}</i> 。',
                           es: '👍 Anchor actualizado a <i>{street}</i> .'
                         },
  'wake2.kept':                { en: '👍 Keeping your saved search anchor.', fr: '👍 Point de recherche conservé.' ,
                 id: '👍 Mempertahankan tautan pencarian tersimpan Anda.',
                 ru: '👍 Сохранение сохраненного якоря поиска.',
                 de: '👍 Ihre gespeicherte Suchanfrage bleibt erhalten.',
                 zh: '👍 保留您保存的搜索锚点。',
                 ja: '👍 保存した検索アンカーを保持します。',
                 es: '👍 Conservando tu ancla de búsqueda guardada.'
               },
  'wake2.anotherHint':         { en: 'Type /l <place> to set a new anchor — for example /l Orchard Road or /l IOI City Mall. Or tap 📍 below to share a fresh GPS location.',
                        fr: 'Tapez /l <lieu> pour définir un nouveau point — par exemple /l Orchard Road ou /l IOI City Mall. Ou touchez 📍 ci-dessous pour partager une position GPS fraîche.' },
  'wake2.offerExpired':        { en: '⏱ That share expired. Tap /l to set a new anchor.',
                         fr: '⏱ Ce partage a expiré. Tapez /l pour définir un nouveau point.',
                         id: '⏱ Share tersebut telah kedaluwarsa. Ketuk /l untuk mengatur anchor baru.',
                         ru: '⏱ Срок действия этой публикации истек. Нажмите /l , чтобы установить новый якорь.',
                         de: '⏱ Diese Freigabe ist abgelaufen. Tippen Sie auf /l , um einen neuen Anker festzulegen.',
                         es: '⏱ Esa acción compartida ha caducado. Pulsa /l para establecer un nuevo enlace.' },

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' ,
                                     id: '🗺 Lihat {n} insiden di satu peta:',
                                     ru: '🗺 Отобразить {n} инцидентов на одной карте:',
                                     de: '🗺 {n} Vorfälle auf einer Karte anzeigen:',
                                     zh: '🗺 在一张地图上查看{n}起事件：',
                                     ja: '🗺 1つの地図で{n}の事件を表示：',
                                     es: '🗺 Visualiza {n} incidentes en un solo mapa:'
                                   },
  'transport.map.incidentsBtn':     { en: 'Show {n} incidents on the Map', fr: 'Afficher {n} incidents sur la carte' ,
                                 id: 'Tampilkan {n} insiden pada Peta',
                                 ru: 'Показать {n} инцидентов на карте',
                                 de: '{n} Vorfälle auf der Karte anzeigen',
                                 zh: '在地图上显示{n}起事件',
                                 ja: '地図上に{n}の事件を表示する',
                                 es: 'Mostrar {n} incidentes en el mapa'
                               },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' ,
                                    id: '🗺 Lihat {n} halte bus dalam satu peta:',
                                    ru: '🗺 Посмотреть {n} автобусных остановок на одной карте:',
                                    de: '🗺 {n} Bushaltestellen auf einer Karte anzeigen:',
                                    zh: '🗺 在一张地图上查看{n}个公交车站：',
                                    ja: '🗺 1つの地図上に{n}個のバス停を表示：',
                                    es: '🗺 Vea {n} paradas de autobús en un solo mapa:'
                                  },
  // v0.60.61 — relabelled per Human Lead. Standardise on the 🚏
  // bus-stop emoji + drop the literal "on map" suffix (it's
  // implied by the button context).
  'transport.map.busStopsBtn':      { en: 'Show all {n} bus stops', fr: 'Voir les {n} arrêts de bus' ,
                                id: 'Tampilkan semua {n} halte bus',
                                ru: 'Показать все {n} автобусные остановки',
                                de: 'Alle {n} Bushaltestellen anzeigen',
                                zh: '显示所有{n}公交车站',
                                ja: 'すべての{n}バス停を表示する',
                                es: 'Mostrar todas las {n} paradas de autobús'
                              },
  'transport.map.stationsCaption':  { en: '🗺 View {n} stations on one map:', fr: '🗺 Voir les {n} stations sur une carte :' ,
                                    id: '🗺 Lihat {n} stasiun dalam satu peta:',
                                    ru: '🗺 Отобразить {n} станций на одной карте:',
                                    de: '🗺 {n} Stationen auf einer Karte anzeigen:',
                                    zh: '🗺 在一张地图上查看{n}个站点：',
                                    ja: '🗺 1つの地図上に{n}個の駅を表示：',
                                    es: '🗺 Visualiza {n} estaciones en un solo mapa:'
                                  },
  // v0.60.98 — operator: show the actual nearest-count instead of
  // "stations on map". Call site (index.js runTransportTrain)
  // interpolates {n} from the slim list length.
  'transport.map.stationsBtn':      { en: 'View {n} Train Stations', fr: 'Voir {n} stations de train' ,
                                id: 'Lihat Stasiun Kereta Api {n}',
                                ru: 'Посмотреть {n} Железнодорожные станции',
                                de: '{n} anzeigen',
                                zh: '查看{n}火车站',
                                ja: '{n}駅を表示する',
                                es: 'Ver {n} estaciones de tren'
                              },

  // Distance row addition for MRT stations (was previously bare).
  // v0.60.72 — per-station row carries an HTML <a> wrapping the
  // station name. The link opens Google Maps' transit detail panel
  // (the operator's "incorporate" ask 2026-05-10): tapping it lands
  // on the station's place sheet with live arrival times. The chat
  // send is HTML parse_mode (see runTransportTrain in index.js).
  'transport.train.stationRow':     { en: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>', fr: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>' ,
                                 id: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>',
                                 ru: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>',
                                 de: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>',
                                 zh: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>',
                                 ja: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>',
                                 es: '{name} · {dist}{crowd}  <a href="{gmapsUrl}">↗</a>'
                               },

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
  'card.carparkMapBtn':           { en: '🅿️ Nearby carparks on map', fr: '🅿️ Parkings proches sur la carte' ,
                         id: '🅿️ Lokasi parkir terdekat di peta',
                         ru: '🅿️ Ближайшие парковки отмечены на карте',
                         de: '🅿️ Parkplätze in der Nähe auf der Karte',
                         zh: '🅿️ 地图上的附近停车场',
                         ja: '🅿️ 地図上の近隣駐車場',
                         es: '🅿️ Aparcamientos cercanos en el mapa'
                       },

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
                                    fr: 'Désolé, /privacy a rencontré une erreur. Veuillez réessayer dans un instant.' ,
                    id: 'Maaf, /privacy mengalami kesalahan. Silakan coba lagi sebentar lagi.',
                    ru: 'Извините, /privacy произошла ошибка. Пожалуйста, попробуйте еще раз через минуту.',
                    de: 'Entschuldigung, beim Aufruf /privacy ist ein Fehler aufgetreten. Bitte versuchen Sie es in Kürze erneut.',
                    es: 'Lo sentimos, se ha producido un error /privacy . Inténtalo de nuevo en un momento.'
                  ,
                    zh: '抱歉， /privacy 出错了。请稍后再试。'
                  },

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
                                    fr: 'Désolé, /legal a rencontré une erreur. Veuillez réessayer dans un instant.' ,
                  id: 'Maaf, /legal mengalami kesalahan. Coba lagi sebentar lagi.',
                  ru: 'Извините, в /legal произошла ошибка. Попробуйте еще раз через минуту.',
                  de: 'Entschuldigung, /legal ist auf einen Fehler gestoßen. Bitte versuchen Sie es in Kürze erneut.',
                  es: 'Lo sentimos, /legal ha dado un error. Inténtalo de nuevo en un momento.'
                ,
                  zh: '抱歉， /legal 出错了。请稍后再试。'
                },

  // v0.59.13 — /recognised localisation
  'recognised.heading':           { en: '🏆 *Singapore — recognised dining*', fr: '🏆 *Singapour — restaurants reconnus*' ,
                         id: '🏆 *Singapura — restoran ternama*',
                         ru: '🏆 *Сингапур — признанный ресторан*',
                         de: '🏆 *Singapur – anerkannte Gastronomie*',
                         zh: '🏆 *新加坡 — 认可的餐饮*',
                         ja: '🏆 *シンガポール - 認定レストラン*',
                         es: '🏆 *Singapur — restaurantes reconocidos*'
                       },
  'recognised.tap':               { en: 'Tap a list to open the source page:', fr: 'Touchez une liste pour ouvrir la page source :' ,
                     id: 'Ketuk daftar untuk membuka halaman sumber:',
                     ru: 'Нажмите на пункт списка, чтобы открыть исходную страницу:',
                     de: 'Tippen Sie auf eine Liste, um die Quellseite zu öffnen:',
                     zh: '点击列表即可打开源页面：',
                     ja: 'リストをタップしてソースページを開きます。',
                     es: 'Pulsa una lista para abrir la página de origen:'
                   },
  'recognised.btn.bib':           { en: '🍜 MICHELIN Bib Gourmand', fr: '🍜 MICHELIN Bib Gourmand' ,
                         id: '🍜 MICHELIN Bib Gourmand',
                         ru: '🍜 MICHELIN Bib Gourmand',
                         de: '🍜 MICHELIN Bib Gourmand',
                         zh: '🍜 米其林必比登推介',
                         ja: '🍜ミシュラン・ビブグルマン',
                         es: '🍜 MICHELIN Bib Gourmand'
                       },
  'recognised.btn.star':          { en: '⭐ MICHELIN Star', fr: '⭐ MICHELIN Étoile' ,
                          id: '⭐ Bintang MICHELIN',
                          ru: '⭐ Звезда Мишлен',
                          de: '⭐ MICHELIN Stern',
                          zh: '⭐米其林星级',
                          ja: '⭐ミシュラン星付き',
                          es: '⭐ Estrella MICHELIN'
                        },
  'recognised.btn.asia50':        { en: "🌏 Asia's 50 Best Restaurants", fr: '🌏 Asia\'s 50 Best Restaurants' ,
                            id: '🌏 50 Restoran Terbaik di Asia',
                            ru: '🌏 50 лучших ресторанов Азии',
                            de: '🌏 Asiens 50 beste Restaurants',
                            zh: '🌏 亚洲50佳餐厅',
                            ja: '🌏 アジアのベストレストラン50選',
                            es: '🌏 Los 50 mejores restaurantes de Asia'
                          },
  'recognised.btn.localProduce':  { en: '🌱 Restaurants using Local Produce', fr: '🌱 Restaurants avec produits locaux' ,
                                  id: '🌱 Restoran yang menggunakan Produk Lokal',
                                  ru: '🌱 Рестораны, использующие местные продукты',
                                  de: '🌱 Restaurants, die regionale Produkte verwenden',
                                  zh: '🌱 使用本地食材的餐厅',
                                  ja: '🌱 地元産の食材を使ったレストラン',
                                  es: '🌱 Restaurantes que utilizan productos locales'
                                },

  // v0.59.13 — /share localisation
  'share.empty':                  { en: 'No recent picks yet. Run /cuisine or /hidden first, then /share to forward to a friend.',
                                    fr: 'Aucun choix récent. Lancez /cuisine ou /hidden d\'abord, puis /share pour partager avec un ami.' ,
                  id: 'Belum ada pilihan terbaru. Jalankan /cuisine atau /hidden terlebih dahulu, lalu /share untuk meneruskan ke teman.',
                  ru: 'Пока нет недавних подборок. Сначала запустите /cuisine или /hidden , затем /share , чтобы переслать другу.',
                  de: 'Noch keine aktuellen Empfehlungen. Führe zuerst /cuisine oder /hidden , dann /share , um die Anfrage an einen Freund weiterzuleiten.',
                  es: 'Aún no hay selecciones recientes. Ejecuta primero /cuisine o /hidden , luego /share para reenviarlo a un amigo.'
                ,
                  zh: '目前还没有精选内容。先运行 /cuisine 或 /hidden ，再运行 /share 转发给朋友。',
                  ja: '最近のおすすめはまだありません。まず /cuisine または /hidden を実行し、次に /share を実行して友達に転送してください。'
                },
  'share.prompt':                 { en: 'Pick a venue to forward to your friend ({n} recent):',
                                    fr: 'Choisissez un lieu à partager avec votre ami ({n} récents) :' ,
                   id: 'Pilih tempat untuk diteruskan ke teman Anda ( {n} baru-baru ini):',
                   ru: 'Выберите место, куда переслать сообщение вашему другу ( {n} ):',
                   de: 'Wählen Sie einen Veranstaltungsort aus, den Sie an Ihren Freund weiterleiten möchten ( {n} kürzlich):',
                   zh: '选择要转发给朋友的地点（ {n}最近的）：',
                   ja: '友達に転送する場所を選択してください（最近の投稿数： {n} ）：',
                   es: 'Elige un lugar para reenviar a tu amigo ( {n} reciente):'
                 },
  'share.mintFailed':             { en: "Sorry, I couldn't mint share links right now.",
                                    fr: 'Désolé, impossible de générer les liens de partage pour le moment.' ,
                       id: 'Maaf, saya tidak bisa membuat tautan berbagi saat ini.',
                       ru: 'Извините, сейчас я не могу поделиться ссылками.',
                       de: 'Tut mir leid, ich konnte im Moment keine Links zum Teilen erstellen.',
                       zh: '抱歉，我现在无法分享链接。',
                       ja: '申し訳ありませんが、今はリンクを共有できません。',
                       es: 'Lo siento, no puedo generar enlaces para compartir en este momento.'
                     },
  'share.error':                  { en: 'Sorry, /share hit an error.',
                                    fr: 'Désolé, /share a rencontré une erreur.' ,
                  id: 'Maaf, /share mengalami kesalahan.',
                  ru: 'Извините, при выполнении /share возникла ошибка.',
                  de: 'Entschuldigung, /share ist auf einen Fehler gestoßen.',
                  es: 'Lo sentimos, /share ha dado un error.'
                ,
                  zh: '抱歉， /share 发生错误。',
                  ja: '申し訳ありません、 /share エラーが発生しました。'
                },

  // v0.59.13 — /buddy localisation
  'buddy.on.body':                { en: '👥 *Buddy mode ON.*\n\nWhen you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. Both of you must confirm before first names + Telegram handles are revealed. Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.\n\n⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._',
                                    fr: '👥 *Mode buddy ACTIVÉ.*\n\nLorsque vous recevez des sélections sanctuaires, un bouton 👥 _Connecter_ apparaît à côté des lieux où un autre utilisateur soleat opté-in se rend dans les 60 prochaines minutes. Vous devez tous deux confirmer avant que les prénoms et identifiants Telegram soient révélés. Limite quotidienne : 5 connexions / 24 h. `/buddy block <chat_id>` pour bloquer. `/buddy report <chat_id> <raison>` pour signaler. `/buddy off` pour désactiver.\n\n⚠ _Pilote — rencontrez uniquement en public, traitez comme un inconnu, faites confiance à votre instinct._' ,
                    id: '👥 *Mode Teman AKTIF.*\n\nSaat Anda menerima pilihan Sanctuary, tombol 👥 _Hubungkan_ akan muncul di sebelah tempat-tempat yang juga akan dikunjungi oleh pengguna soleat lain yang telah mendaftar dalam 60 menit berikutnya. Anda berdua harus mengkonfirmasi sebelum nama depan + nama pengguna Telegram ditampilkan. Batas harian: 5 koneksi / 24 jam. `/buddy block<chat_id> ` untuk memblokir. `/buddy report<chat_id><reason> ` untuk menandai. `/buddy off` untuk menonaktifkan.\n\n⚠ _Pilot — hanya bertemu di tempat umum, perlakukan seperti orang asing, percayai insting Anda._',
                    ru: '👥 *Режим "Друг в команде" включен.*\n\nКогда вы получаете предложения от Sanctuary, рядом с местами, куда другой пользователь Soleat, также подписавшийся на рассылку, направляется в течение следующих 60 минут, появляется кнопка 👥 _Подключиться_. Оба пользователя должны подтвердить свое согласие, прежде чем будут отображены их имена и ники в Telegram. Дневной лимит: 5 подключений / 24 часа. `/buddy block<chat_id> ` для блокировки. `/buddy report<chat_id><reason> ` для установки флага. `/buddy off` для отключения.\n\n⚠ _Пилот — встречайтесь только на публике, относитесь к людям как к незнакомцам, доверяйте своей интуиции._',
                    de: '👥 *Buddy-Modus EIN.*\n\nWenn du Sanctuary-Tipps erhältst, erscheint neben Orten, die ein anderer Soleat-Nutzer innerhalb der nächsten 60 Minuten besucht, ein 👥 „Verbinden“-Button. Ihr müsst beide bestätigen, bevor eure Vornamen und Telegram-Namen angezeigt werden. Tägliches Limit: 5 Verbindungen / 24 Stunden. `/buddy block<chat_id> ` zum Blockieren. `/buddy report<chat_id><reason> ` zum Flaggen. `/buddy off` zum Deaktivieren.\n\n⚠ _Pilot — Treffen Sie sich nur an öffentlichen Orten, behandeln Sie die Person wie einen Fremden, vertrauen Sie Ihrem Bauchgefühl._',
                    zh: '👥 *好友模式开启*\n\n当您收到“避难所”推荐时，如果其他已选择加入“避难所”的用户也将在接下来的 60 分钟内前往某个地点，该地点旁边会出现一个 👥 _Connect_ 按钮。双方必须确认后，才能显示彼此的名字和 Telegram 用户名。每日上限：5 个连接/24 小时。 `/buddy block <chat_id>` 屏蔽。 `/buddy report <chat_id> <reason>` 举报。 `/buddy off` 禁用。\n\n⚠ _飞行员——只在公共场所见面，像对待陌生人一样对待对方，相信你的直觉。_',
                    ja: '👥 *バディモードON。*\n\nSanctuaryのおすすめを受け取ると、次の60分以内に別のオプトイン済みのSoleatユーザーが向かう予定の場所の横に👥 _接続_ボタンが表示されます。お互いに確認しないと、名前とTelegramのハンドル名が表示されません。1日あたりの上限: 5接続 / 24時間。 `/buddy block <chat_id>` でブロック。 `/buddy report <chat_id> <reason>` で報告。 `/buddy off` で無効にします。\n\n⚠ _パイロット ― 必ず公共の場所で会い、見知らぬ人のように扱い、自分の直感を信じること。_',
                    es: '👥 *Modo compañero activado.*\n\nCuando recibas recomendaciones de Sanctuary, aparecerá un botón 👥 _Conectar_ junto a los lugares a los que otro usuario de soleat que haya optado por participar también se dirigirá en los próximos 60 minutos. Ambos debéis confirmar antes de que se muestren los nombres y los nombres de usuario de Telegram. Límite diario: 5 conexiones / 24 h. `/buddy block<chat_id> ` para bloquear. `/buddy report<chat_id><reason> ` para marcar. `/buddy off` para desactivar.\n\n⚠ _Piloto: queda solo en público, trata como a un desconocido, confía en tu instinto._'
                  },
  'buddy.off':                    { en: '👥 Buddy mode OFF.', fr: '👥 Mode buddy DÉSACTIVÉ.' ,
                id: '👥 Mode teman MATI.',
                ru: '👥 Режим "Друг" выключен.',
                de: '👥 Buddy-Modus AUS.',
                zh: '👥好友模式已关闭。',
                ja: '👥 バディモードOFF。',
                es: '👥 Modo compañero DESACTIVADO.'
              },
  'buddy.block.usage':            { en: 'Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer.',
                                    fr: 'Usage : `/buddy block <chat_id>`. Récupérez l\'ID de chat depuis une offre de match précédente.' ,
                        id: 'Penggunaan: `/buddy block<chat_id> ` ID obrolan dari penawaran perjodohan sebelumnya.',
                        ru: 'Использование: `/buddy block<chat_id> ` . Получите идентификатор чата из предыдущего предложения о матче.',
                        de: 'Verwendung: `/buddy block<chat_id> ` Holen Sie sich die Chat-ID aus einem vorherigen Spielangebot.',
                        zh: '用法： `/buddy block<chat_id> ` . 从之前的匹配邀请中获取聊天 ID。',
                        ja: '使用方法: `/buddy block<chat_id> ` . 以前のマッチングオファーからチャットIDを取得します。',
                        es: 'Uso: `/buddy block<chat_id> ` . Obtén el ID de chat de una oferta de coincidencia anterior.'
                      },
  'buddy.block.ok':               { en: '🚫 Blocked {target}. They will never be matched with you.',
                                    fr: '🚫 {target} bloqué. Vous ne serez plus jamais associé.' ,
                     id: '🚫 {target} diblokir. Mereka tidak akan pernah dipasangkan dengan Anda.',
                     ru: '🚫 Заблокирован {target} . Они никогда не будут сопоставлены с вами.',
                     de: '🚫 Blockiert {target} . Diese Person wird Ihnen niemals zugeordnet werden.',
                     zh: '🚫 已屏蔽{target} 。他们永远不会与您匹配。',
                     ja: '🚫 {target}をブロックしました。今後、このユーザーとマッチングされることはありません。',
                     es: '🚫 Bloqueado {target} . Nunca se le pondrá en contacto contigo.'
                   },
  'buddy.block.cap':              { en: 'Could not block (max 50 blocks reached).',
                                    fr: 'Impossible de bloquer (limite de 50 atteinte).' ,
                      id: 'Tidak dapat memblokir (maksimal 50 blok tercapai).',
                      ru: 'Не удалось заблокировать (достигнуто максимальное количество блоков — 50).',
                      de: 'Blockierung fehlgeschlagen (maximal 50 Blöcke erreicht).',
                      zh: '无法进行封锁（已达到最大封锁数量 50 个）。',
                      ja: 'ブロックできませんでした（最大ブロック数50に達しました）。',
                      es: 'No se pudo bloquear (se alcanzó el máximo de 50 bloques).'
                    },
  'buddy.report.usage':           { en: 'Usage: `/buddy report <chat_id> <reason>`.',
                                    fr: 'Usage : `/buddy report <chat_id> <raison>`.' ,
                         id: 'Penggunaan: `/buddy report<chat_id><reason> ` .',
                         ru: 'Использование: `/buddy report<chat_id><reason> ` .',
                         de: 'Verwendung: `/buddy report<chat_id><reason> ` .',
                         zh: '用法： `/buddy report<chat_id><reason> ` 。',
                         ja: '使用方法: `/buddy report<chat_id><reason> ` .',
                         es: 'Uso: `/buddy report<chat_id><reason> ` .'
                       },
  'buddy.report.ok':              { en: "📝 Report logged. {target} is also auto-blocked from your matches. We'll review.",
                                    fr: '📝 Signalement enregistré. {target} est aussi auto-bloqué de vos matches. Nous examinerons.' ,
                      id: '📝 Laporan telah dicatat. {target} juga diblokir secara otomatis dari kecocokan Anda. Kami akan meninjaunya.',
                      ru: '📝 Сообщение зарегистрировано. {target} также автоматически заблокирован для ваших матчей. Мы рассмотрим его.',
                      de: '📝 Bericht protokolliert. {target} wurde automatisch für deine Matches blockiert. Wir prüfen den Vorgang.',
                      zh: '📝 已记录举报。 {target}已被自动屏蔽，无法匹配。我们将进行审核。',
                      ja: '📝 報告が記録されました。 {target}はマッチング対象から自動的にブロックされます。確認いたします。',
                      es: '📝 Se ha registrado un informe. {target} también ha sido bloqueado automáticamente de tus coincidencias. Lo revisaremos.'
                    },
  'buddy.status':                 { en: '👥 Buddy mode is currently *{state}*. Today\'s connections: {n}/{cap}. Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                                    fr: '👥 Le mode buddy est actuellement *{state}*. Connexions aujourd\'hui : {n}/{cap}. Utilisez `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <raison>`.' ,
                   id: '👥 Mode teman saat ini adalah * {state} *. Koneksi hari ini: {n} / {cap} . Gunakan `/buddy on` , `/buddy off` , `/buddy block<id> ` , `/buddy report<id><reason> ` .',
                   ru: '👥 Режим "Друг" в данный момент * {state} *. Количество подключений за сегодня: {n} / {cap} . Используйте `/buddy on` , `/buddy off` , `/buddy block<id> ` , `/buddy report<id><reason> ` .',
                   de: '👥 Der Buddy-Modus ist aktuell * {state} *. Heutige Verbindungen: {n} / {cap} . Verwenden Sie `/buddy on` , `/buddy off` , `/buddy block<id> ` , `/buddy report<id><reason> ` .',
                   zh: '👥 好友模式当前处于 * {state} * 状态。今日连接数： {n} / {cap} 。使用`/buddy on` 、 `/buddy off`或`/buddy block<id> ` ， `/buddy report<id><reason> ` 。',
                   es: '👥 El modo compañero está actualmente en * {state} *. Conexiones de hoy: {n} / {cap} . Usa `/buddy on` , `/buddy off` , `/buddy block<id> ` , `/buddy report<id><reason> ` .'
                 ,
                   ja: '👥 バディモードは現在 *{state}* です。今日の接続: {n}/{cap}。 `/buddy on`、 `/buddy off`、 `/buddy block <id>`、 `/buddy report <id> <reason>`を使用してください。'
                 },
  'buddy.status.on':              { en: 'ON', fr: 'ACTIVÉ' ,
                      id: 'PADA',
                      ru: 'НА',
                      de: 'AN',
                      zh: '在',
                      ja: 'の上',
                      es: 'EN'
                    },
  'buddy.status.off':             { en: 'OFF', fr: 'DÉSACTIVÉ' ,
                       id: 'MATI',
                       ru: 'ВЫКЛЮЧЕННЫЙ',
                       de: 'AUS',
                       zh: '离开',
                       ja: 'オフ',
                       es: 'APAGADO'
                     },
  'buddy.error':                  { en: 'Sorry, /buddy hit an error.', fr: 'Désolé, /buddy a rencontré une erreur.' ,
                  id: 'Maaf, /buddy mengalami kesalahan.',
                  ru: 'Извините, /buddy выдал ошибку.',
                  de: 'Entschuldigung, /buddy ist auf einen Fehler gestoßen.',
                  es: 'Lo siento, /buddy ha dado un error.'
                ,
                  zh: '抱歉， /buddy 发生错误。',
                  ja: '申し訳ありません、 /buddy エラーが発生しました。'
                },

  // v0.59.13 — "Open in Google Maps" buttons added to /carpark,
  // /transport train (nearest stations), /transport bus (nearest stops).
  // Caption + button label for the multi-stop Google Maps directions URL.
  'gmaps.openBtn':                { en: 'Google Map ↗', fr: 'Google Maps ↗' ,
                    id: 'Peta Google ↗',
                    ru: 'Карта Google ↗',
                    de: 'Google Maps ↗',
                    zh: '谷歌地图 ↗',
                    ja: 'Googleマップ↗',
                    es: 'Mapa de Google ↗'
                  },

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
  'incident.type.Accident':            { en: 'Accident', fr: 'Accident' ,
                             id: 'Kecelakaan',
                             ru: 'Несчастный случай',
                             de: 'Unfall',
                             zh: '事故',
                             ja: '事故',
                             es: 'Accidente'
                           },
  'incident.type.MajorAccident':       { en: 'Major Accident', fr: 'Accident grave' ,
                                  id: 'Kecelakaan Besar',
                                  ru: 'Крупная авария',
                                  de: 'Schwerer Unfall',
                                  zh: '重大事故',
                                  ja: '重大事故',
                                  es: 'Accidente grave'
                                },
  'incident.type.Roadwork':            { en: 'Roadwork', fr: 'Travaux' ,
                             id: 'Perbaikan jalan',
                             ru: 'Дорожные работы',
                             de: 'Straßenarbeiten',
                             zh: '道路施工',
                             ja: '道路工事',
                             es: 'Obras viales'
                           },
  'incident.type.RoadWorks':           { en: 'Road Works', fr: 'Travaux' ,
                              id: 'Pekerjaan Jalan',
                              ru: 'Дорожные работы',
                              de: 'Straßenarbeiten',
                              zh: '道路施工',
                              ja: '道路工事',
                              es: 'Obras viales'
                            },
  'incident.type.VehicleBreakdown':    { en: 'Vehicle Breakdown', fr: 'Véhicule en panne' ,
                                     id: 'Kerusakan Kendaraan',
                                     ru: 'Поломка транспортного средства',
                                     de: 'Fahrzeugpanne',
                                     zh: '车辆故障',
                                     ja: '車両故障',
                                     es: 'Avería del vehículo'
                                   },
  'incident.type.HeavyTraffic':        { en: 'Heavy Traffic', fr: 'Trafic dense' ,
                                 id: 'Lalu Lintas Padat',
                                 ru: 'Интенсивное движение',
                                 de: 'Starker Verkehr',
                                 zh: '交通拥堵',
                                 ja: '交通渋滞',
                                 es: 'Tránsito pesado'
                               },
  'incident.type.Misc':                { en: 'Misc.', fr: 'Incident divers' ,
                         id: 'Lain-lain.',
                         ru: 'Разное.',
                         de: 'Verschiedenes',
                         zh: '杂项',
                         ja: 'その他',
                         es: 'Varios.'
                       },
  'incident.type.MiscIncident':        { en: 'Miscellaneous', fr: 'Incident divers' ,
                                 id: 'Aneka ragam',
                                 ru: 'Разнообразный',
                                 de: 'Verschiedenes',
                                 zh: '各种各样的',
                                 ja: 'その他',
                                 es: 'Misceláneas'
                               },
  'incident.type.Diversion':           { en: 'Diversion', fr: 'Déviation' ,
                              id: 'Pengalihan',
                              ru: 'Отвлечение',
                              de: 'Umleitung',
                              zh: '导流',
                              ja: '気晴らし',
                              es: 'Desviación'
                            },
  'incident.type.UnattendedVehicle':   { en: 'Unattended Vehicle', fr: 'Véhicule abandonné' ,
                                      id: 'Kendaraan Tanpa Pengawasan',
                                      ru: 'Транспортное средство без присмотра',
                                      de: 'Unbeaufsichtigtes Fahrzeug',
                                      zh: '无人看管的车辆',
                                      ja: '無人車両',
                                      es: 'Vehículo desatendido'
                                    },
  'incident.type.Obstacle':            { en: 'Obstacle', fr: 'Obstacle' ,
                             id: 'Rintangan',
                             ru: 'Препятствие',
                             de: 'Hindernis',
                             zh: '障碍',
                             ja: '障害',
                             es: 'Obstáculo'
                           },
  'incident.type.RoadBlock':           { en: 'Road Block', fr: 'Route bloquée' ,
                              id: 'Penghalang Jalan',
                              ru: 'Дорожный блокпост',
                              de: 'Straßensperre',
                              zh: '路障',
                              ja: '道路封鎖',
                              es: 'Bloqueo de carretera'
                            },
  'incident.type.MassDisruption':      { en: 'Mass Disruption', fr: 'Perturbation majeure' ,
                                   id: 'Gangguan Massal',
                                   ru: 'Массовое нарушение',
                                   de: 'Massenzerstörung',
                                   zh: '大规模破坏',
                                   ja: '大規模な混乱',
                                   es: 'Disrupción masiva'
                                 },
  'incident.type.Weather':             { en: 'Weather', fr: 'Météo' ,
                            id: 'Cuaca',
                            ru: 'Погода',
                            de: 'Wetter',
                            zh: '天气',
                            ja: '天気',
                            es: 'Clima'
                          },
  'incident.type.Animals':             { en: 'Animals', fr: 'Animaux' ,
                            id: 'Hewan',
                            ru: 'Животные',
                            de: 'Tiere',
                            zh: '动物',
                            ja: '動物',
                            es: 'Animales'
                          },
  'incident.type.Incident':            { en: 'Incident', fr: 'Incident' ,
                             id: 'Insiden',
                             ru: 'Инцидент',
                             de: 'Vorfall',
                             zh: '事件',
                             ja: '事件',
                             es: 'Incidente'
                           },

  // v0.59.17 — /cuisine chat-side strings (the chat reply that opens
  // the cuisine TMA, NOT the TMA itself which has its own i18n). Per
  // Human Lead 2026-05-06: with /language fr or French device locale,
  // the /cuisine chat message + buttons should be French.
  'cuisine.chat.title':           { en: '🍴 Cuisine Picker — Singapore to Johor Bahru',
                                    fr: '🍴 Sélecteur de cuisine — Singapour à Johor Bahru' ,
                         id: '🍴 Pencari Kuliner — Singapura hingga Johor Bahru',
                         ru: '🍴 Выбор кухни — из Сингапура в Джохор-Бару',
                         de: '🍴 Kulinarische Auswahl – von Singapur nach Johor Bahru',
                         zh: '🍴 美食精选 — 新加坡到新山',
                         ja: '🍴 料理選び — シンガポールからジョホールバルへ',
                         es: '🍴 Guía de cocina: de Singapur a Johor Bahru'
                       },
  'cuisine.chat.anchored':        { en: '📍 Anchored to your last shared location.',
                                    fr: '📍 Ancré sur votre dernière position partagée.' ,
                            id: '📍 Terhubung ke lokasi terakhir yang Anda bagikan.',
                            ru: '📍 Привязано к вашему последнему месту совместного использования.',
                            de: '📍 An Ihrem zuletzt geteilten Standort verankert.',
                            zh: '📍 锚定于您上次共享的位置。',
                            ja: '📍最後に共有した場所に固定されています。',
                            es: '📍 Anclado a tu última ubicación compartida.'
                          },
  // v0.59.22 — both strings trimmed per Human Lead 2026-05-07. The
  // previous wording duplicated "open the picker" / "device GPS"
  // across the two messages (Telegram needs them split because
  // reply-keyboard + inline-keyboard can't share a message). Now
  // each message says one thing once.
  'cuisine.chat.shareForAccurate':{ en: 'For accurate picks, share your location first.',
                                    fr: 'Pour des choix précis, partagez d’abord votre position.' ,
                                    id: 'Untuk pilihan yang akurat, bagikan lokasi Anda terlebih dahulu.',
                                    ru: 'Для точного выбора, сначала сообщите свое местоположение.',
                                    de: 'Für präzise Vorhersagen teilen Sie bitte zuerst Ihren Standort mit.',
                                    zh: '为了获得准确的选座结果，请先分享您的位置。',
                                    ja: 'より正確な検索結果を得るには、まず現在地を共有してください。',
                                    es: 'Para obtener predicciones precisas, primero comparte tu ubicación.'
                                  },
  'cuisine.chat.openWithGps':     { en: '↓',
                                    fr: '↓' ,
                               id: '↓',
                               ru: '↓',
                               de: '↓',
                               zh: '↓',
                               ja: '↓',
                               es: '↓'
                             },
  'cuisine.chat.openBtn':         { en: '🍴 Open Cuisine Picker', fr: '🍴 Ouvrir le sélecteur' ,
                           id: '🍴 Pemilih Masakan Terbuka',
                           ru: '🍴 Открытый выбор блюд',
                           de: '🍴 Küchenauswahl öffnen',
                           zh: '🍴 开放式美食选择器',
                           ja: '🍴 料理選択ツールを開く',
                           es: '🍴 Selector de cocina abierto'
                         },
  'cuisine.chat.shareLocBtn':     { en: '📍 Share location with bot', fr: '📍 Partager la position avec le bot' ,
                               id: '📍 Bagikan lokasi dengan bot',
                               ru: '📍 Делитесь местоположением с ботом',
                               de: '📍 Standort mit dem Bot teilen',
                               zh: '📍 与机器人分享位置',
                               ja: '📍 ボットと位置情報を共有',
                               es: '📍 Comparte tu ubicación con el bot'
                             },
  'cuisine.chat.openError':       { en: "Sorry, I can't open the Cuisine Picker right now.",
                                    fr: 'Désolé, impossible d’ouvrir le sélecteur de cuisine pour le moment.' ,
                             id: 'Maaf, saya tidak bisa membuka Pemilih Masakan saat ini.',
                             ru: 'Извините, я не могу сейчас открыть меню выбора блюд.',
                             de: 'Tut mir leid, ich kann den Küchenauswahl-Assistenten gerade nicht öffnen.',
                             zh: '抱歉，我现在无法打开菜系选择器。',
                             ja: '申し訳ありませんが、現在、料理選択ツールを開くことができません。',
                             es: 'Lo siento, no puedo abrir el selector de cocina ahora mismo.'
                           },
  'cuisine.chat.webhookOnly':     { en: "The Cuisine Picker needs the webhook-mode TMA. Try /hidden for chat-based picks instead, or just type 'find me ramen' / similar and I'll search.",
                                    fr: 'Le Sélecteur de cuisine nécessite la TMA en mode webhook. Essayez /hidden pour des choix en chat, ou tapez « trouve-moi des ramen » / similaire et je cherche.' ,
                               id: 'Pemilih Masakan membutuhkan TMA mode webhook. Coba /hidden untuk pilihan berbasis obrolan, atau ketik saja \'cari ramen untukku\' / serupa dan saya akan mencarinya.',
                               ru: 'Для работы Cuisine Picker требуется режим веб-хука TMA. Попробуйте /hidden для выбора блюд через чат или просто введите \'find me ramen\' / similar, и я выполню поиск.',
                               de: 'Der Menü-Auswahldienst benötigt den TMA im Webhook-Modus. Verwenden Sie stattdessen /hidden für Chat-basierte Auswahlmöglichkeiten oder geben Sie einfach „find me ramen“ oder Ähnliches ein, und ich suche für Sie.',
                               zh: '美食选择器需要 webhook 模式的 TMA。如果想通过聊天进行选择，请尝试/hidden ，或者直接输入“找拉面”/类似内容，我会帮你搜索。',
                               es: 'El selector de cocina necesita el TMA en modo webhook. Prueba con /hidden para selecciones basadas en chat, o simplemente escribe \'find me ramen\' o similar y lo buscaré.'
                             ,
                               ja: 'Cuisine PickerにはWebhookモードのTMAが必要です。チャットベースの選択には /hidden をお試しください。または、「ラーメンを探して」などと入力していただければ検索します。'
                             }
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
