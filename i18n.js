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
                      id: '📋 1 tempat',
                      ru: '📋 1 место',
                      de: '📋 1 Ort',
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
                       zh: '🔎 搜索结果：',
                       ja: '🔎 検索結果：',
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
                   id: 'Tutup',
                   ru: 'Закрыто',
                   de: 'Geschlossen',
                   zh: '已打烊',
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
                 ru: '🔴 многолюдно',
                 de: '🔴 voll',
                 zh: '🔴 忙碌',
                 ja: '🔴 混雑',
                 es: '🔴 concurrido'
               },
  'crowd.medium':              { en: '🟡 moderate', fr: '🟡 modéré' ,
                   id: '🟡 sedang',
                   ru: '🟡 умеренно',
                   de: '🟡 mäßig',
                   zh: '🟡 适中',
                   ja: '🟡 やや混雑',
                   es: '🟡 moderado'
                 },
  'crowd.low':                 { en: '🟢 quiet',    fr: '🟢 calme' ,
                id: '🟢 tenang',
                ru: '🟢 спокойно',
                de: '🟢 ruhig',
                zh: '🟢安静',
                ja: '🟢 空いている',
                es: '🟢 tranquilo'
              },

  // copy-syntax — wrapper line above the /cuisine command
  'syntax.wrapper':            { en: 'Re-run this search anytime by tapping or pasting:', fr: 'Relancez cette recherche à tout moment en touchant ou collant :' ,
                     id: 'Lakukan pencarian ulang kapan saja dengan mengetuk atau menempelkan:',
                     ru: 'Повторить поиск можно в любое время, просто нажав или вставив текст:',
                     de: 'Sie können diese Suche jederzeit durch Antippen oder Einfügen erneut ausführen:',
                     zh: '您可随时点击或粘贴以下命令重新运行此搜索：',
                     ja: 'タップまたは貼り付けることで、いつでもこの検索を再実行できます。',
                     es: 'Vuelve a ejecutar esta búsqueda en cualquier momento tocando o pegando:'
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
                          de: '📍 Tippen Sie hier, um Ihren aktuellen Standort zu teilen.',
                          zh: '📍点击分享您的当前位置。',
                          ja: '📍 現在地を共有するにはタップしてください。',
                          es: '📍 Toca para compartir tu ubicación actual.'
                        },
  'bot.location.locale':       {
    en: '📍 Share your location once so Soleat uses your locale (or type `/location <place name>` to set it manually).',
    fr: '📍 Partagez votre position une fois pour que Soleat utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).',
    id: '📍 Bagikan lokasi Anda sekali agar Soleat memakai wilayah Anda (atau ketik `/location <place name>` untuk mengaturnya manual).',
    ru: '📍 Поделитесь местоположением один раз, чтобы Soleat использовал ваш регион (или введите `/location <place name>`, чтобы задать вручную).',
    de: '📍 Teilen Sie Ihren Standort einmalig, damit Soleat Ihre Regionseinstellung verwendet (oder geben Sie `/location <place name>` ein, um ihn manuell festzulegen).',
    zh: '📍 分享一次您的位置，以便 Soleat 使用您的语言环境（或输入 `/location <place name>` 手动设置）。',
    ja: '📍 一度位置情報を共有すると、Soleat があなたの地域設定を使用します (または、`/location <place name>` と入力して手動で設定します)。',
    es: '📍 Comparte tu ubicación una sola vez para que Soleat use tu configuración regional (o escribe `/location <place name>` para configurarla manualmente).'
  },
  'bot.noresults':             { en: 'No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search.',
                                 fr: 'Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche.' ,
                    id: 'Tidak ada hasil Google Places untuk "{q}" di dekat Anda. Coba /cuisine untuk pemilih makanan, /hidden untuk tempat makan favorit di dekat Anda, atau ubah frasa pencarian Anda.',
                    ru: 'В Google Places нет результатов поиска по запросу "{q}" рядом с вами. Попробуйте использовать /cuisine для выбора заведения, /hidden для поиска интересных мест поблизости или измените формулировку запроса.',
                    de: 'Für "{q}" in Ihrer Nähe wurden keine Google Places-Ergebnisse gefunden. Versuchen Sie es mit /cuisine für die Restaurantauswahl, /hidden für weitere Restaurants in der Nähe oder formulieren Sie Ihre Suche um.',
                    es: 'No hay resultados de Google Places para "{q}" cerca de ti. Prueba con /cuisine para el selector, /hidden para joyas cercanas o reformula tu búsqueda.'
                  ,
                    zh: '您附近没有与“{q}”相关的 Google Places 结果。可以试试 /cuisine 使用菜系选择器，或 /hidden 查找附近的宝藏餐馆，或者换个说法再搜索。',
                    ja: '「{q}」で検索しても、お近くのGoogleプレイスの結果は見つかりませんでした。ピッカーで /cuisine、近くのおすすめスポットで /hidden を試すか、検索語句を変更してください。'
                  },
  'bot.error.freetext':        {
    en: 'Sorry, free-text search hit an error. Try /cuisine or /hidden.',
    fr: 'Désolé, la recherche libre a rencontré une erreur. Essayez /cuisine ou /hidden.',
    id: 'Maaf, pencarian teks bebas mengalami kesalahan. Coba /cuisine atau /hidden.',
    ru: 'Извините, свободный поиск завершился ошибкой. Попробуйте /cuisine или /hidden.',
    de: 'Entschuldigung, die Freitextsuche ist auf einen Fehler gestoßen. Versuche /cuisine oder /hidden.',
    zh: '抱歉，自由文本搜索出错了。请试试 /cuisine 或 /hidden。',
    ja: '申し訳ありません、フリーテキスト検索でエラーが発生しました。/cuisine または /hidden をお試しください。',
    es: 'Lo sentimos, la búsqueda libre ha dado un error. Prueba con /cuisine o /hidden.'
  },
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
                       ja: '⇩─ 似た料理やジャンルを提供する飲食店 ─ ⇩\n⇩─ 正確には{dish}ではない ─ ⇩',
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
                        es: '⚠️ <i>Ningún restaurante de Singapur sirve claramente {dish}; estos coinciden con tus palabras de búsqueda:</i>'
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
                            es: '🙂 <i>¿Quizás buscabas un método de cocción? Toca una cocina a continuación o busca literalmente.</i>'
                          },
  // v0.60.131 — free-text "looks like a question" decline. Shown when
  // someone types a sentence ("does Beach Road curry rice sell chiffon
  // cake") instead of a dish / cuisine name. Distinct from /s.
  'freetext.questionDeclined': { en: "🍛 Please try a dish name, cooking method, or food term - e.g. Mee Soto, char kway teow, or goulash dumpling",
                                 fr: "🍛 Essayez un nom de plat, une méthode de cuisson ou un terme culinaire - par ex. Mee Soto, char kway teow ou goulash dumpling" ,
                                id: '🍛 Silakan coba sebutkan nama hidangan, metode memasak, atau istilah makanan - misalnya Mee Soto, char kway teow, atau goulash dumpling.',
                                ru: '🍛 Пожалуйста, попробуйте назвать название блюда, способ приготовления или кулинарный термин — например, Mee Soto, char kway teow или goulash dumpling.',
                                de: '🍛 Bitte versuchen Sie es mit einem Gerichtnamen, einer Zubereitungsmethode oder einem Fachbegriff aus der Küche – z. B. Mee Soto, Char Kway Teow oder Gulaschknödel.',
                                zh: '🍛 请尝试提供菜名、烹饪方法或食物相关词汇——例如：Mee Soto、char kway teow 或 goulash dumpling',
                                ja: '🍛 料理名、調理法、または食品用語を試してみてください。例：Mee Soto、char kway teow、goulash dumpling',
                                es: '🍛 Por favor, prueba con el nombre de un plato, un método de cocción o un término culinario, por ejemplo: Mee Soto, char kway teow o goulash dumpling.'
                              },
  // v0.60.228 — transport queries (MRT / bus / "how to get to X")
  // aren't food searches; point the user at the /transport tool.
  'freetext.transportRedirect': {
    en: '🚆 For trains, buses, and getting around Singapore, tap /transport. This chat searches for food and eateries.',
    fr: '🚆 Pour les trains, bus et déplacements à Singapour, tapez /transport. Ce chat recherche des plats et des restaurants.',
    id: '🚆 Untuk kereta, bus, dan perjalanan di Singapura, ketuk /transport. Obrolan ini mencari makanan dan tempat makan.',
    ru: '🚆 Для поездов, автобусов и передвижения по Сингапуру нажмите /transport. Этот чат ищет еду и заведения.',
    de: '🚆 Für Bahn, Bus und Wege durch Singapur tippe auf /transport. Dieser Chat sucht nach Essen und Lokalen.',
    zh: '🚆 关于地铁、公交和在新加坡出行，请点击 /transport。此聊天用于搜索美食和餐馆。',
    ja: '🚆 電車・バス・シンガポール市内の移動は /transport をタップしてください。このチャットでは食べ物と飲食店を検索します。',
    es: '🚆 Para trenes, autobuses y moverte por Singapur, toca /transport. Este chat busca comida y locales.'
  },
  'cookmethod.literalBtn':     { en: '🔍 Search literally',
                                 fr: '🔍 Rechercher tel quel' ,
                            id: '🔍 Cari secara harfiah',
                            ru: '🔍 Искать буквально',
                            de: '🔍 Wörtlich suchen',
                            zh: '🔍 逐字搜索',
                            ja: '🔍 文字通り検索',
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
                       de: '🔍 Weitere Treffer suchen',
                       zh: '🔍 搜索更多',
                       ja: '🔍 さらに検索する',
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
                       es: '⌛ Esa búsqueda ha caducado. Vuelve a escribir tu consulta.'
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
                      id: '📍 Lokasi diatur ke <b>{label}</b>.{cap}',
                      ru: '📍 Местоположение установлено на <b>{label}</b>.{cap}',
                      de: '📍 Standort eingestellt auf <b>{label}</b>.{cap}',
                      zh: '📍 位置已设置为 <b>{label}</b>。{cap}',
                      ja: '📍 場所を <b>{label}</b> に設定しました。{cap}',
                      es: '📍 Ubicación establecida en <b>{label}</b>.{cap}'
                    },
  // v0.61.412 — operator: when the user PICKS a new search area in a TMA and
  // returns to chat, confirm it. Fires only on a deliberate pick AND an actual
  // area change (never on app-open / auto-detect). {label} is HTML-escaped.
  'loc.searchArea.set':        { en: '📍 Area set: {area}\n\nUse <code>/location</code> or <code>/l &lt;place&gt;</code> · change address',
                                 fr: '📍 Zone définie : {area}\n\nUtilisez <code>/location</code> ou <code>/l &lt;lieu&gt;</code> · changer d’adresse' ,
                         id: '📍 Area diatur: {area}\n\nGunakan <code>/location</code> atau <code>/l &lt;place&gt;</code> · ubah alamat',
                         ru: '📍 Район поиска: {area}\n\nИспользуйте <code>/location</code> или <code>/l &lt;place&gt;</code> · изменить адрес',
                         de: '📍 Suchgebiet festgelegt: {area}\n\nVerwenden Sie <code>/location</code> oder <code>/l &lt;place&gt;</code> · Adresse ändern',
                         zh: '📍 搜索区域已设为：{area}\n\n使用 <code>/location</code> 或 <code>/l &lt;place&gt;</code> · 更改地址',
                         ja: '📍 エリア設定: {area}\n\n <code>/location</code> または <code>/l &lt;place&gt;</code> を使用して住所を変更します',
                         es: '📍 Área configurada: {area}\n\nUsa <code>/location</code> o <code>/l &lt;place&gt;</code> · cambiar dirección'
                       },
  'loc.set.capNote':           { en: ' Searches anchored here are capped to {km} km.',
                                 fr: ' Les recherches sont limitées à {km} km autour de ce point.' ,
                      id: ' Pencarian yang berpusat di sini dibatasi hingga {km} km.',
                      ru: ' Поиск, привязанный к этому месту, ограничен диапазоном {km} км.',
                      de: ' Hier verankerte Suchanfragen sind auf {km} km begrenzt.',
                      zh: ' 此处的搜索范围上限为{km}公里。',
                      ja: ' ここを基準とした検索範囲は{km} kmに制限されます。',
                      es: ' Las búsquedas ancladas aquí están limitadas a {km} km.'
                    },
  'loc.set.unknown':           { en: "⚠️ I don't recognise that quick-pick. Tap one of the buttons or share a pin.",
                                 fr: "⚠️ Je ne reconnais pas cette sélection. Touchez l'un des boutons ou partagez une position." ,
                      id: '⚠️ Saya tidak mengenali pilihan cepat itu. Ketuk salah satu tombol atau bagikan lokasi.',
                      ru: '⚠️ Не удалось распознать этот быстрый выбор. Нажмите одну из кнопок или отправьте геометку.',
                      de: '⚠️ Diese Schnellauswahl ist mir unbekannt. Tippe auf eine der Schaltflächen oder teile einen Standort.',
                      zh: '⚠️ 我不认识这个快捷选择。请点击其中一个按钮或分享位置。',
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
                            id: '<i>Ingin melihat tempat makan di <b>{place}</b>?</i>',
                            ru: '<i>Хотите посмотреть заведения общественного питания в <b>{place}</b>?</i>',
                            de: '<i>Möchten Sie Restaurants sehen bei <b>{place}</b>?</i>',
                            zh: '<i>想查看 <b>{place}</b> 的餐馆吗？</i>',
                            ja: '<i><b>{place}</b> の飲食店を見ますか？</i>',
                            es: '<i>¿Quieres ver restaurantes en <b>{place}</b>?</i>'
                          },
  'loc.searchPick.btn':        { en: '🔍 See eateries here',
                                 fr: '🔍 Voir les établissements ici' ,
                         id: '🔍 Lihat tempat makan di sini',
                         ru: '🔍 Показать заведения здесь',
                         de: '🔍 Lokale hier anzeigen',
                         zh: '🔍 点击此处查看餐厅',
                         ja: '🔍 飲食店一覧はこちら',
                         es: '🔍 Ver restaurantes aquí'
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
                              zh: '📍 <b>{place}</b> — 此处显示 {total} 家餐馆中的 {shown} 家',
                              ja: '📍 <b>{place}</b> — {total}軒中{shown}軒の飲食店を表示しています',
                              es: '📍 <b>{place}</b> — mostrando {shown} de {total} restaurantes aquí'
                            },
  // v0.61.124 — auto-suggest intro when the place itself is weak
  // (< 5 eateries OR average rating < 4.0). Sent ahead of the
  // automatic nearby fan-out so the user understands why we're
  // showing extras without them tapping the button.
  'place.autoNearbyIntro':     { en: '_Slim pickings at <b>{place}</b> — here are the top-rated eateries nearby:_',
                                 fr: '_Peu d’options à <b>{place}</b> — voici les mieux notés à proximité :_' ,
                            id: '_Pilihan yang terbatas di <b>{place}</b> — berikut adalah tempat makan dengan peringkat teratas di dekatnya:_',
                            ru: '_Выбор в <b>{place}</b> невелик — вот лучшие заведения поблизости:_',
                            de: '_Magere Auswahl bei <b>{place}</b> — hier sind die bestbewerteten Restaurants in der Nähe:_',
                            zh: '_<b>{place}</b> 的选择不多 — 以下是附近评分最高的餐馆：_',
                            ja: '_<b>{place}</b> は選択肢が少なめです — 近隣のおすすめ飲食店はこちらです:_',
                            es: '_Escasas opciones en <b>{place}</b> — aquí están los restaurantes mejor valorados de la zona:_'
                          },
  // v0.61.124 — "outside the zone" header for precinct anchors
  // (Marina Bay, Chinatown, etc.) where the polygon exclusion filters
  // out venues inside the precinct itself.
  'place.outsideHeader':       { en: '✨ <b>Top {n} eateries outside {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements hors de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' ,
                          id: '✨ <b>{n} tempat makan terbaik di luar {place}</b> (dalam radius {km} km, diurutkan berdasarkan peringkat · Michelin · kelangkaan · keramaian)',
                          ru: '✨ <b>Топ-{n} заведений за пределами {place}</b> (в пределах {km} км, по рейтингу · Michelin · редкости · заполненности)',
                          de: '✨ <b>Top {n} Restaurants außerhalb von {place}</b> (im Umkreis von {km} km, sortiert nach Bewertung · Michelin · Seltenheit · Besucheraufkommen)',
                          zh: '✨ <b>{place} 以外的前 {n} 家餐馆</b>（{km} 公里内，按评分 · 米其林 · 稀有度 · 客流量排序）',
                          ja: '✨ <b>{place} 以外のおすすめ飲食店トップ{n}軒</b>（{km} km以内、評価・ミシュラン・希少性・混雑度順）',
                          es: '✨ <b>Los {n} mejores restaurantes fuera de {place}</b> (en un radio de {km} km, ordenados por puntuación · Michelin · rareza · afluencia)'
                        },
  'place.outsideEmpty':        { en: '🤷 No standout eateries outside {place} (within {km} km) right now.',
                                 fr: '🤷 Aucun établissement marquant hors de {place} (dans un rayon de {km} km) en ce moment.' ,
                         id: '🤷 Tidak ada tempat makan unggulan di luar {place} (dalam radius {km} km) saat ini.',
                         ru: '🤷 В настоящее время за пределами {place} (в пределах {km} км) нет выдающихся заведений общественного питания.',
                         de: '🤷 Derzeit gibt es außerhalb von {place} (im Umkreis von {km} km) keine herausragenden Restaurants.',
                         zh: '🤷 目前在 {place} 以外（{km} 公里范围内）没有特别出色的餐馆。',
                         ja: '🤷 現在、{place} 以外（{km} km 以内）には特におすすめの飲食店はありません。',
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
                      id: '✨ Tempat makan terbaik di sekitar sini',
                      ru: '✨ Лучшие рестораны поблизости',
                      de: '✨ Top-Restaurants in der Nähe',
                      zh: '✨附近热门餐厅',
                      ja: '✨ 近隣の人気飲食店',
                      es: '✨ Los mejores restaurantes cercanos'
                    },
  'place.nearbyHeader':        { en: '✨ <b>Top {n} eateries near {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements près de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' ,
                         id: '✨ <b>{n} tempat makan terbaik di dekat {place}</b> (dalam radius {km} km, diurutkan berdasarkan peringkat · Michelin · kelangkaan · keramaian)',
                         ru: '✨ <b>Топ-{n} заведений рядом с {place}</b> (в пределах {km} км, по рейтингу · Michelin · редкости · заполненности)',
                         de: '✨ <b>Top {n} Restaurants in der Nähe von {place}</b> (im Umkreis von {km} km, sortiert nach Bewertung · Michelin · Seltenheit · Publikumsandrang)',
                         zh: '✨ <b>{place} 附近的前 {n} 家餐馆</b>（{km} 公里内，按评分 · 米其林 · 稀有度 · 客流量排序）',
                         ja: '✨ <b>{place}周辺のおすすめ飲食店トップ{n}軒</b>（{km} km以内、評価・ミシュラン・希少性・混雑度順）',
                         es: '✨ <b>Los {n} mejores restaurantes cerca de {place}</b> (en un radio de {km} km, ordenados por puntuación · Michelin · rareza · afluencia)'
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
                    id: '⏱ Saran tersebut telah kedaluwarsa. Ketik nama tempat lagi untuk memuat ulang.',
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
                         de: '📍 Tippen Sie, um Ihren Standort zu teilen, oder geben Sie einen Ortsnamen ein. Ich suche anschließend.',
                         zh: '📍 点击分享您的位置，或输入地点名称。我稍后会搜索。',
                         ja: '📍 タップして現在地を共有するか、場所の名前を入力してください。後で検索します。',
                         es: '📍 Toca para compartir tu ubicación o escribe el nombre de un lugar. Yo lo buscaré después.'
                       },
  'bot.lang.set.en':           { en: '✅ Language set to English.', fr: '✅ Language set to English.' ,
                    },
  'bot.lang.set.fr':           { en: '✅ Langue réglée sur français.', fr: '✅ Langue réglée sur français.' ,
                    },
  // v0.62.480 — acks for the extended /language set. Each shows in the
  // chosen tongue (en+fr keys carry the same native string) so the user
  // gets confirmation in the language they just picked. The line notes
  // that the confirmation applies to the Mini-App surfaces.
  'bot.lang.set.id':           { en: '✅ Bahasa disetel ke Indonesia (untuk Mini App).', fr: '✅ Bahasa disetel ke Indonesia (untuk Mini App).' ,
                    },
  'bot.lang.set.ru':           { en: '✅ Язык переключён на русский (для мини-приложений).', fr: '✅ Язык переключён на русский (для мини-приложений).' ,
                    },
  'bot.lang.set.de':           { en: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).', fr: '✅ Sprache auf Deutsch eingestellt (für die Mini-Apps).' ,
                    },
  'bot.lang.set.zh':           { en: '✅ 语言已设置为中文（用于小程序）。', fr: '✅ 语言已设置为中文（用于小程序）。' ,
                    },
  'bot.lang.set.ja':           { en: '✅ 言語を日本語に設定しました（ミニアプリ用）。', fr: '✅ 言語を日本語に設定しました（ミニアプリ用）。' ,
                    },
  'bot.lang.set.es':           { en: '✅ Idioma configurado en español (para las Mini Apps).', fr: '✅ Idioma configurado en español (para las Mini Apps).' ,
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
                   id: 'Suhu: {c}°C · {f}°F',
                   ru: 'Температура: {c}°C · {f}°F',
                   de: 'Temperatur: {c}°C · {f}°F',
                   zh: '温度：{c}°C · {f}°F',
                   ja: '温度：{c}°C · {f}°F',
                   es: 'Temperatura: {c}°C · {f}°F'
                 },
  'weather.humidity':          { en: 'Humidity: {pct}%', fr: 'Humidité : {pct} %' ,
                       id: 'Kelembapan: {pct}%',
                       ru: 'Влажность: {pct}%',
                       de: 'Luftfeuchtigkeit: {pct}%',
                       zh: '湿度：{pct}%',
                       ja: '湿度：{pct}%',
                       es: 'Humedad: {pct}%'
                     },
  'weather.rain':              { en: 'Rain: {mm} mm @ {at}', fr: 'Pluie : {mm} mm @ {at}' ,
                   id: 'Hujan: {mm} mm @ {at}',
                   ru: 'Осадки: {mm} мм @ {at}',
                   de: 'Regen: {mm} mm @ {at}',
                   zh: '降雨量：{mm}毫米 @ {at}',
                   ja: '降水量：{mm} mm @ {at}',
                   es: 'Lluvia: {mm} mm a {at}'
                 },
  'weather.wind':              { en: 'Wind: {kt} kt{dir}', fr: 'Vent : {kt} kt{dir}' ,
                   id: 'Angin: {kt} kt{dir}',
                   ru: 'Ветер: {kt} кт{dir}',
                   de: 'Wind: {kt} kt{dir}',
                   zh: '风速：{kt} 节{dir}',
                   ja: '風速：{kt} ノット{dir}',
                   es: 'Viento: {kt} kt{dir}'
                 },
  'weather.forecastNext2h':    { en: 'Next 2 hours in {area}: {desc}{valid}', fr: 'Prochaines 2 h à {area} : {desc}{valid}' ,
                             id: '2 jam berikutnya di {area}: {desc}{valid}',
                             ru: 'Следующие 2 часа в {area}: {desc}{valid}',
                             de: 'Nächste 2 Stunden in {area}: {desc}{valid}',
                             zh: '接下来两小时在{area}：{desc}{valid}',
                             ja: '{area}の今後 2 時間: {desc}{valid}',
                             es: 'Próximas 2 horas en {area}: {desc}{valid}'
                           },
  'weather.forecastUntil':     { en: ' (until {time})', fr: ' (jusqu’à {time})' ,
                            id: ' (hingga {time})',
                            ru: ' (до {time})',
                            de: ' (bis {time})',
                            zh: '（直到{time}）',
                            ja: '（{time}まで）',
                            es: ' (hasta {time})'
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
                          ru: 'Я не знаю этот район — попробуйте ввести название города, например, Тампинес, или просто /weather, чтобы использовать свою метку.',
                          de: 'Ich kenne diese Gegend nicht – versuchen Sie es mit einem Ortsnamen wie Tampines oder geben Sie einfach /weather ein, um Ihren geteilten Standort zu verwenden.',
                          es: 'No conozco esa zona; prueba con el nombre de una ciudad como Tampines, o simplemente /weather para usar el marcador que has compartido.'
                        ,
                          zh: '我不熟悉那个地区——试试淡滨尼之类的城镇名称，或者直接输入 /weather 来使用您共享的位置。',
                          ja: 'その地域はよく知らないので、タンピネスのような町名を試してみるか、/weather と入力して共有ピンを使ってみてください。'
                        },
  'weather.forArea':           { en: '— for {area} —', fr: '— pour {area} —' ,
                      id: '— untuk {area} —',
                      ru: '— для {area} —',
                      de: '— für {area} —',
                      zh: '— {area} —',
                      ja: '— {area}向け —',
                      es: '— para {area} —'
                    },
  'weather.headOutRaining':    { en: "☔ Raining around {area} right now — hold ~20–30 min or pick somewhere covered.", fr: "☔ Il pleut autour de {area} en ce moment — patientez ~20–30 min ou choisissez un endroit couvert." ,
                             id: '☔ Saat ini sedang hujan di sekitar {area} — tunggu sekitar 20-30 menit atau pilih tempat yang terlindung.',
                             ru: '☔ Сейчас в районе {area} идёт дождь — подождите 20-30 минут или выберите место, защищенное от дождя.',
                             de: '☔ Es regnet gerade in der Gegend um {area} — warten Sie ~20–30 Minuten oder suchen Sie sich einen überdachten Ort.',
                             zh: '☔ 现在{area}附近正在下雨——请等待约20-30分钟或找个有遮挡的地方。',
                             ja: '☔ 現在、{area}周辺では雨が降っています。20～30分ほどお待ちいただくか、屋根のある場所へお進みください。',
                             es: '☔ Está lloviendo en los alrededores de {area} ahora mismo; espera entre 20 y 30 minutos o elige un lugar cubierto.'
                           },
  'weather.headOutShowery':    { en: "🌦️ Dry now, but {area}'s 2-hour outlook is {desc} — head out soon if you're going somewhere open-air.", fr: "🌦️ Sec pour l’instant, mais les prévisions 2 h à {area} sont : {desc} — sortez bientôt si vous allez en plein air." ,
                             id: '🌦️ Saat ini kering, tetapi prakiraan cuaca 2 jam ke depan untuk {area} adalah {desc} — segera berangkat jika Anda akan pergi ke tempat terbuka.',
                             ru: '🌦️ Сейчас сухо, но прогноз на 2 часа для {area} — {desc}. Выходите пораньше, если собираетесь на открытый воздух.',
                             de: '🌦️ Im Moment ist es trocken, aber die 2-Stunden-Vorhersage für {area} lautet {desc} – wenn Sie irgendwo im Freien unterwegs sind, sollten Sie bald losziehen.',
                             zh: '🌦️ 现在天气干燥，但{area}的 2 小时天气预报为{desc} — 如果你要去户外场所，请尽快出发。',
                             ja: '🌦️ 今は乾燥していますが、{area}の 2 時間後の予報は{desc}です。屋外に出かける予定の方は、早めに出発してください。',
                             es: '🌦️ Ahora está seco, pero el pronóstico para las próximas 2 horas en {area} es {desc}; sal pronto si vas a algún lugar al aire libre.'
                           },
  'weather.headOutGood':       { en: "✅ Good window — {area} looks dry for the next 2 hours.", fr: "✅ Bon créneau — {area} devrait rester au sec pendant 2 h." ,
                          id: '✅ Waktu yang tepat — {area} terlihat kering selama 2 jam ke depan.',
                          ru: '✅ Хорошее окно — в {area} сухо ближайшие 2 часа.',
                          de: '✅ Gutes Wetterfenster — {area} sieht für die nächsten 2 Stunden trocken aus.',
                          zh: '✅ 天气晴好—— {area}未来2小时内看起来会很干燥。',
                          ja: '✅ 良い見通しです — {area}は今後 2 時間ほど乾燥した状態が続くようです。',
                          es: '✅ Buen momento: {area} parece seco durante las próximas 2 horas.'
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
                      id: '🌙 Malam ini di {zone}: {desc}.',
                      ru: '🌙 Сегодня вечером в {zone}: {desc}.',
                      de: '🌙 Heute Abend in der {zone}: {desc}.',
                      zh: '🌙 今晚在{zone}: {desc}。',
                      ja: '🌙 今夜の{zone}：{desc}。',
                      es: '🌙 Esta noche en la {zone}: {desc}.'
                    },
  // per-pick rain caveat (rendered on open-air venue cards)
  'weather.rainNowNear':       { en: "🌧️ Raining around {area} right now — covered seating helps.", fr: "🌧️ Il pleut autour de {area} en ce moment — un coin couvert est préférable." ,
                          id: '🌧️ Hujan turun di sekitar {area} saat ini — tempat duduk yang terlindungi sangat membantu.',
                          ru: '🌧️ Сейчас в районе {area} идёт дождь — крытые места для сидения очень помогают.',
                          de: '🌧️ Es regnet gerade in der Gegend um {area} – überdachte Sitzgelegenheiten helfen.',
                          zh: '🌧️现在{area}附近正在下雨——有遮雨棚的座位很有帮助。',
                          ja: '🌧️ 現在、{area}周辺では雨が降っています。屋根付きの座席があると便利です。',
                          es: '🌧️ Está lloviendo en {area} ahora mismo; sentarse bajo techo ayuda.'
                        },
  'weather.rainSoonNear':      { en: "🌧️ {desc} in {area}'s 2-hour outlook — covered seating helps.", fr: "🌧️ Prévisions 2 h à {area} : {desc} — un coin couvert est préférable." ,
                           id: '🌧️ {desc} dalam prakiraan 2 jam untuk {area} — tempat duduk beratap sangat membantu.',
                           ru: '🌧️ {desc} в прогнозе на 2 часа для {area} — места под навесом помогут.',
                           de: '🌧️ {desc} in der 2-Stunden-Vorhersage für {area} — überdachte Sitzplätze helfen.',
                           zh: '🌧️ 未来 2 小时 {area} 预计{desc} — 有遮挡的座位会更好。',
                           ja: '🌧️ {area}の2時間予報は{desc} — 屋根付きの座席が役立ちます。',
                           es: '🌧️ {desc} en el pronóstico de 2 horas de {area}; los asientos cubiertos ayudan.'
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
                   id: 'Tidak ada tempat parkir dengan slot kosong di dekat sini.',
                   ru: 'Поблизости нет свободных парковочных мест.',
                   de: 'In der Nähe gibt es keine Parkplätze mit freien Stellplätzen.',
                   zh: '附近没有空余车位的停车场。',
                   ja: 'この付近には空き駐車場がありません。',
                   es: 'No hay aparcamientos con plazas disponibles cerca de aquí.'
                 },
  'carpark.header':            { en: '🅿️ Nearest carparks with available lots', fr: '🅿️ Parkings les plus proches avec places disponibles' ,
                     id: '🅿️ Tempat parkir terdekat dengan slot yang tersedia',
                     ru: '🅿️ Ближайшие парковки со свободными местами',
                     de: '🅿️ Nächstgelegene Parkplätze mit freien Stellplätzen',
                     zh: '🅿️ 附近有空位的停车场',
                     ja: '🅿️ 空きのある最寄りの駐車場',
                     es: '🅿️ Aparcamientos más cercanos con plazas disponibles'
                   },
  'carpark.row':               { en: '{i}. {name}  ·  {lots} lots  ·  {dist}', fr: '{i}. {name}  ·  {lots} places  ·  {dist}' ,
                  id: '{i}. {name} · {lots} slot · {dist}',
                  ru: '{i}. {name} · {lots} мест · {dist}',
                  de: '{i}. {name} · {lots} Plätze · {dist}',
                  zh: '{i}. {name} · {lots} 个空位 · {dist}',
                  ja: '{i}. {name} · {lots} 台分 · {dist}',
                  es: '{i}. {name} · {lots} plazas · {dist}'
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
                        ru: 'Сравнить все парковки ({n})',
                        de: 'Vergleiche alle {n} Parkplätze',
                        zh: '比较全部 {n} 个停车场',
                        ja: '{n}箇所の駐車場をすべて比較',
                        es: 'Comparar los {n} aparcamientos'
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
                        id: '🍚 Buka Pusat Jajanan',
                        ru: '🍚 Открыть центр уличной еды',
                        de: '🍚 Hawker-Zentrum öffnen',
                        zh: '🍚 打开小贩中心',
                        ja: '🍚 ホーカーセンターを開く',
                        es: '🍚 Abrir centro de comida callejera'
                      },

  // /transport top menu
  'transport.menu.title':      { en: '🇸🇬 *Transport*', fr: '🇸🇬 *Transports*' ,
                           id: '🇸🇬 *Transportasi*',
                           ru: '🇸🇬 *Транспорт*',
                           de: '🇸🇬 *Verkehr*',
                           zh: '🇸🇬 *交通*',
                           ja: '🇸🇬 *交通機関*',
                           es: '🇸🇬 *Transporte*'
                         },
  'transport.menu.btn.train':       { en: '🚇 Train', fr: '🚇 Métro' ,
                               id: '🚇 Kereta',
                               ru: '🚇 Метро',
                               de: '🚇 Bahn',
                               zh: '🚇 地铁',
                               ja: '🚇 電車',
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
                                   zh: '🚦 路况事件',
                                   ja: '🚦 交通障害',
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
                              ru: '🚇 Метро (MRT)',
                              de: '🚇 Bahn (MRT)',
                              zh: '🚇 地铁（MRT）',
                              ja: '🚇 電車（MRT）',
                              es: '🚇 Tren (MRT)'
                            },
  'transport.train.status':         { en: 'Status: {status}', fr: 'État : {status}' ,
                             id: 'Status: {status}',
                             ru: 'Статус: {status}',
                             de: 'Status: {status}',
                             zh: '状态：{status}',
                             ja: 'ステータス: {status}',
                             es: 'Estado: {status}'
                           },
  'transport.train.notes':          { en: 'Notes: {note}', fr: 'Remarques : {note}' ,
                            id: 'Catatan: {note}',
                            ru: 'Примечания: {note}',
                            de: 'Anmerkungen: {note}',
                            zh: '备注：{note}',
                            ja: '注記: {note}',
                            es: 'Notas: {note}'
                          },
  'transport.train.refreshed':      { en: 'Refreshed: {at}', fr: 'Actualisé : {at}' ,
                                id: 'Diperbarui: {at}',
                                ru: 'Обновлено: {at}',
                                de: 'Aktualisiert: {at}',
                                zh: '已刷新：{at}',
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
                              es: '🟡 medio'
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
                                    id: '🚇 3 Stasiun Kereta Terdekat{wx}',
                                    ru: '🚇 3 ближайшие станции метро{wx}',
                                    de: '🚇 Die 3 nächstgelegenen MRT-Stationen{wx}',
                                    zh: '🚇 最近的 3 个地铁站{wx}',
                                    ja: '🚇 最寄りの3つの駅{wx}',
                                    es: '🚇 Las 3 estaciones de tren más cercanas{wx}'
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
                                  ru: '🟢 Сеть не перегружена — 0 из {total} платформ превышают низкую плотность.',
                                  de: '🟢 Das Netz ist nicht überlastet — 0 von {total} Bahnsteigen liegen über geringer Dichte.',
                                  zh: '🟢 线网不拥挤 — {total} 个站台中有 0 个超过低密度。',
                                  ja: '🟢 ネットワークは混雑していません — 低密度以上のプラットフォームは{total}個中 0 個です。',
                                  es: '🟢 La red no está saturada: 0 de {total} plataformas superan la baja densidad.'
                                },
  'transport.train.network.medium': { en: '🟡 {medium} moderate · {high} high (of {total}) — Lines: {lines}',
                                      fr: '🟡 {medium} modéré · {high} élevé (sur {total}) — Lignes : {lines}' ,
                                     id: '🟡 {medium} sedang · {high} tinggi (dari {total}) — Jalur: {lines}',
                                     ru: '🟡 {medium} умеренно · {high} высоко (из {total}) — Линии: {lines}',
                                     de: '🟡 {medium} moderat · {high} hoch (von {total}) — Linien: {lines}',
                                     zh: '🟡 {medium} 个中等 · {high} 个高（共 {total} 个）— 线路：{lines}',
                                     ja: '🟡 {medium}中程度 · {high}高（{total}件中）— 路線: {lines}',
                                     es: '🟡 {medium} moderado · {high} alto (de {total}) — Líneas: {lines}'
                                   },
  'transport.train.network.high':   { en: '🔴 {high} high · {medium} moderate (of {total}) — Lines: {lines}',
                                      fr: '🔴 {high} élevé · {medium} modéré (sur {total}) — Lignes : {lines}' ,
                                   id: '🔴 {high} tinggi · {medium} moderat (dari {total}) — Jalur: {lines}',
                                   ru: '🔴 {high} высоко · {medium} умеренно (из {total}) — Линии: {lines}',
                                   de: '🔴 {high} hoch · {medium} mittel (von {total}) — Linien: {lines}',
                                   zh: '🔴 {high} 个高 · {medium} 个中等（共 {total} 个）— 线路：{lines}',
                                   ja: '🔴 {high}高 · {medium}中程度（{total}件中）— 路線: {lines}',
                                   es: '🔴 {high} alto · {medium} moderado (de {total}) — Líneas: {lines}'
                                 },
  'transport.train.affectedLines':  { en: '⚠️ Affected lines:', fr: '⚠️ Lignes affectées :' ,
                                    id: '⚠️ Jalur yang terpengaruh:',
                                    ru: '⚠️ Затронутые линии:',
                                    de: '⚠️ Betroffene Linien:',
                                    zh: '⚠️受影响的线路：',
                                    ja: '⚠️ 影響を受ける路線:',
                                    es: '⚠️ Líneas afectadas:'
                                  },
  // v0.60.75 — static MRT network frequency footer (LTA published).
  // Stand-in for per-train arrival times (LTA DataMall doesn't expose
  // them) — gives users a calibration of when to expect the next train.
  // v0.60.88 — operator 2026-05-11: swap 🚇 → ⏱️ since the line is
  // about timing, not trains.
  'transport.train.headway':        { en: '⏱️ Frequency: {peakMin}–{peakMax} min peak · {offMin}–{offMax} min off-peak (LTA published)',
                                      fr: '⏱️ Fréquence : {peakMin}–{peakMax} min en heure de pointe · {offMin}–{offMax} min hors pointe (LTA publié)' ,
                              id: '⏱️ Frekuensi: {peakMin}–{peakMax} mnt jam sibuk · {offMin}–{offMax} mnt di luar jam sibuk (diterbitkan LTA)',
                              ru: '⏱️ Частота: {peakMin}–{peakMax} мин пик · {offMin}–{offMax} мин вне пика (опубликовано LTA)',
                              de: '⏱️ Frequenz: {peakMin}–{peakMax} Min. Hauptverkehrszeit · {offMin}–{offMax} Min. Nebenverkehrszeit (LTA veröffentlicht)',
                              zh: '⏱️ 班次间隔：高峰 {peakMin}–{peakMax} 分钟 · 平峰 {offMin}–{offMax} 分钟（LTA 公布）',
                              ja: '⏱️ 運行間隔: ピーク時 {peakMin}–{peakMax} 分 · オフピーク時 {offMin}–{offMax} 分（LTA 公表）',
                              es: '⏱️ Frecuencia: {peakMin}–{peakMax} min hora punta · {offMin}–{offMax} min fuera de hora punta (publicado por LTA)'
                            },
  // v0.60.97 — operator: spell "d" as "days" / "jours".
  'transport.train.engineering':    { en: '🔧 Upcoming engineering (next 7 days):', fr: '🔧 Travaux à venir (sous 7 jours) :' ,
                                  id: '🔧 Pekerjaan perawatan mendatang (7 hari ke depan):',
                                  ru: '🔧 Предстоящие инженерные работы (в течение следующих 7 дней):',
                                  de: '🔧 Anstehende Bauarbeiten (nächste 7 Tage):',
                                  zh: '🔧 即将进行的工程（未来7天）：',
                                  ja: '🔧 今後の保守工事（今後7日間）：',
                                  es: '🔧 Próximas obras de mantenimiento (próximos 7 días):'
                                },
  // v0.60.98 — operator: rename to '🇸🇬 Train Map and Status' so
  // the chat CTA reads as a destination, not an action verb.
  'transport.train.openMapBtn':     { en: '🇸🇬 Train Map and Status', fr: '🇸🇬 Carte et état des trains' ,
                                 id: '🇸🇬 Peta dan Status Kereta',
                                 ru: '🇸🇬 Карта и статус метро',
                                 de: '🇸🇬 Zugnetzplan und Status',
                                 zh: '🇸🇬 地铁线路图和状态',
                                 ja: '🇸🇬 列車の路線図と運行状況',
                                 es: '🇸🇬 Mapa y estado de los trenes'
                               },
  'transport.train.unreachable':    { en: "Sorry, I can't reach the MRT feed right now.", fr: "Désolé, le flux MRT est inaccessible pour le moment." ,
                                  id: 'Maaf, saya tidak bisa mengakses siaran MRT saat ini.',
                                  ru: 'Извините, сейчас не удаётся получить данные MRT.',
                                  de: 'Tut mir leid, ich kann den MRT-Feed im Moment nicht erreichen.',
                                  zh: '抱歉，我现在无法获取地铁数据。',
                                  ja: '申し訳ありませんが、現在MRTのフィードにアクセスできません。',
                                  es: 'Lo siento, no puedo acceder a los datos del MRT en este momento.'
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
                                  id: '🚏 {count} halte bus terdekat',
                                  ru: '🚏 {count} ближайших автобусных остановок',
                                  de: '🚏 Nächstgelegene {count} Bushaltestellen',
                                  zh: '🚏 最近的{count}个公交车站',
                                  ja: '🚏 最寄りのバス停 {count} 件',
                                  es: '🚏 Las {count} paradas de autobús más cercanas'
                                },
  'transport.bus.stopMetaFirst':    { en: '🚏 Bus Stop № {code} is 📍 {dist} away from current location.', fr: '🚏 Arrêt de bus № {code} à 📍 {dist} de votre position actuelle.' ,
                                  id: '🚏 Halte Bus No. {code} berjarak 📍 {dist} dari lokasi Anda saat ini.',
                                  ru: '🚏 Автобусная остановка № {code} — 📍 {dist} от текущего местоположения.',
                                  de: '🚏 Bushaltestelle Nr. {code} ist 📍 {dist} von Ihrem aktuellen Standort entfernt.',
                                  zh: '🚏 公交车站 № {code}距离当前位置 📍 {dist}。',
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
                            id: '· {desc} ({road}) — {dist}',
                            ru: '· {desc} ({road}) — {dist}',
                            de: '· {desc} ({road}) — {dist}',
                            zh: '· {desc} ({road}) — {dist}',
                            ja: '・{desc}（{road}）— {dist}',
                            es: '· {desc} ({road}) — {dist}'
                          },
  'transport.bus.stopCode':         { en: '  Code: {code}', fr: '  Code : {code}' ,
                             id: '  Kode: {code}',
                             ru: '  Код: {code}',
                             de: '  Code: {code}',
                             zh: '  编号：{code}',
                             ja: '  番号: {code}',
                             es: '  Código: {code}'
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
                                   zh: '⏱ 下一班公交 — 最近的 3 个站点',
                                   ja: '⏱ 次のバス到着 — 最寄りの3停留所',
                                   es: '⏱ Próximas llegadas: las 3 paradas más cercanas'
                                 },
  'transport.bus.noLive':           { en: '  no real-time arrivals', fr: '  aucun passage en temps réel' ,
                           id: '  tidak ada kedatangan secara real-time',
                           ru: '  нет данных о прибытии в режиме реального времени',
                           de: '  keine Echtzeit-Ankünfte',
                           zh: '  没有实时到达信息',
                           ja: '  リアルタイムの到着情報はありません',
                           es: '  sin llegadas en tiempo real'
                         },
  'transport.bus.noStopsCrowd':     { en: '👥 No bus stops within 800 m to sample.', fr: '👥 Aucun arrêt de bus à moins de 800 m à échantillonner.' ,
                                 id: '👥 Tidak ada halte bus dalam radius 800 m untuk disurvei.',
                                 ru: '👥 В радиусе 800 м нет автобусных остановок для выборки.',
                                 de: '👥 Keine Bushaltestellen im Umkreis von 800 m für eine Stichprobe.',
                                 zh: '👥 800 米内没有可供采样的公交车站。',
                                 ja: '👥 800m以内にサンプリングできるバス停はありません。',
                                 es: '👥 No hay paradas de autobús a menos de 800 m para muestrear.'
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
                               ru: 'Сидячих мест: {n}',
                               de: 'Verfügbare Sitzplätze: {n}',
                               zh: '剩余座位：{n}',
                               ja: '空席：{n}',
                               es: 'Asientos disponibles: {n}'
                             },
  'transport.bus.load.standing':    { en: 'Standing Available: {n}', fr: 'Places debout : {n}' ,
                                  id: 'Tersedia tempat berdiri: {n}',
                                  ru: 'Стоячих мест: {n}',
                                  de: 'Stehplätze verfügbar: {n}',
                                  zh: '可站立空位：{n}',
                                  ja: '立席：{n}',
                                  es: 'Plazas de pie disponibles: {n}'
                                },
  'transport.bus.load.limited':     { en: 'Limited Standing: {n}', fr: 'Debout limité : {n}' ,
                                 id: 'Tempat Berdiri Terbatas: {n}',
                                 ru: 'Мало стоячих мест: {n}',
                                 de: 'Begrenzte Stehplätze: {n}',
                                 zh: '站立空位不多：{n}',
                                 ja: '立席わずか：{n}',
                                 es: 'Plazas de pie limitadas: {n}'
                               },
  'transport.bus.load.footer':      { en: '(of {n} services with live load data)', fr: '(sur {n} services avec données de charge en direct)' ,
                                id: '(dari {n} layanan dengan data okupansi langsung)',
                                ru: '(из {n} сервисов с данными о текущей нагрузке)',
                                de: '(von {n} Diensten mit Live-Auslastungsdaten)',
                                zh: '（共 {n} 个班次有实时载客数据）',
                                ja: '（リアルタイム乗車率データのある{n}便のうち）',
                                es: '(de {n} servicios con datos de ocupación en tiempo real)'
                              },
  'transport.bus.noLoad':           { en: 'No live load data right now — try again in 30 s.', fr: 'Aucune donnée de charge en direct — réessayez dans 30 s.' ,
                           id: 'Saat ini tidak ada data okupansi langsung — coba lagi dalam 30 detik.',
                           ru: 'Данные о текущей нагрузке в данный момент отсутствуют — попробуйте еще раз через 30 секунд.',
                           de: 'Derzeit liegen keine Live-Auslastungsdaten vor – versuchen Sie es in 30 Sekunden erneut.',
                           zh: '目前没有实时载客数据——30 秒后再试。',
                           ja: '現在、リアルタイムの乗車率データはありません。30秒後にもう一度お試しください。',
                           es: 'No hay datos de ocupación en tiempo real en este momento; inténtalo de nuevo en 30 segundos.'
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
                                ru: 'Извините, данные об автобусах сейчас недоступны.',
                                de: 'Leider ist der Bus-Feed momentan nicht verfügbar.',
                                zh: '抱歉，目前公交信息暂不可用。',
                                ja: '申し訳ありませんが、現在バスの運行状況に関する情報はご利用いただけません。',
                                es: 'Lo sentimos, el servicio de datos de autobuses no está disponible en este momento.'
                              },

  // /transport incidents
  'transport.incidents.offline':    { en: '🚦 Traffic feed offline (LTA key not configured).', fr: '🚦 Flux de circulation hors-ligne (clé LTA non configurée).' ,
                                  id: '🚦 Umpan lalu lintas offline (kunci LTA belum dikonfigurasi).',
                                  ru: '🚦 Данные о дорожной обстановке недоступны (ключ LTA не настроен).',
                                  de: '🚦 Verkehrsdaten-Feed offline (LTA-Schlüssel nicht konfiguriert).',
                                  zh: '🚦 路况数据离线（LTA 密钥未配置）。',
                                  ja: '🚦 交通情報フィードがオフラインです（LTAキーが設定されていません）。',
                                  es: '🚦 Los datos de tráfico están fuera de línea (la clave LTA no está configurada).'
                                },
  'transport.incidents.heading':    { en: '🚦 *Live traffic incidents*', fr: '🚦 *Incidents de circulation en direct*' ,
                                  id: '🚦 *Insiden lalu lintas langsung*',
                                  ru: '🚦 *Информация о дорожно-транспортных происшествиях в режиме реального времени*',
                                  de: '🚦 *Aktuelle Verkehrsmeldungen*',
                                  zh: '🚦 *实时交通事件*',
                                  ja: '🚦 *リアルタイム交通情報*',
                                  es: '🚦 *Incidentes de tráfico en directo*'
                                },
  // v0.60.72 — /causeway live SG ⟷ JB border camera stills.
  'transport.causeway.heading':     { en: '🛂 SG ⟷ JB checkpoint cameras', fr: '🛂 Caméras du poste-frontière SG ⟷ JB' ,
                                 id: '🛂 Kamera pos pemeriksaan SG ⟷ JB',
                                 ru: '🛂 Камеры на КПП SG ⟷ JB',
                                 de: '🛂 SG ⟷ JB Kontrollpunktkameras',
                                 zh: '🛂 新加坡 ⟷ 新山检查站摄像头',
                                 ja: '🛂 シンガポール ⟷ ジョホールバル 検問所カメラ',
                                 es: '🛂 Cámaras de control en SG ⟷ JB'
                               },
  'transport.causeway.refreshed':   { en: '_Refreshed: {at}_', fr: '_Actualisé : {at}_' ,
                                   id: '_Diperbarui: {at}_',
                                   ru: '_Обновлено: {at}_',
                                   de: '_Aktualisiert: {at}_',
                                   zh: '_刷新时间：{at}_',
                                   ja: '_更新日時: {at}_',
                                   es: '_Actualizado: {at}_'
                                 },
  // v0.60.103 — live camera count + per-checkpoint breakdown.
  'transport.causeway.count':       { en: '_{n} cameras live ({breakdown})_', fr: '_{n} caméras en direct ({breakdown})_' ,
                               id: '_{n} kamera siaran langsung ({breakdown})_',
                               ru: '_{n} камеры в прямом эфире ({breakdown})_',
                               de: '_{n} Kameras live ({breakdown})_',
                               zh: '_{n} 个摄像头实时在线（{breakdown}）_',
                               ja: '_{n}台のカメラがライブ配信中（{breakdown}）_',
                               es: '_{n} cámaras en directo ({breakdown})_'
                             },
  'transport.causeway.empty':       { en: 'LTA returned no checkpoint cameras right now — try again in a minute.',
                                      fr: 'LTA n’a renvoyé aucune caméra de poste-frontière — réessayez dans une minute.' ,
                               id: 'LTA tidak menemukan kamera pos pemeriksaan saat ini — coba lagi dalam satu menit.',
                               ru: 'На данный момент LTA не обнаружила ни одной записи с камер видеонаблюдения — попробуйте еще раз через минуту.',
                               de: 'Die LTA hat im Moment keine Kontrollpunktkameras gemeldet – versuchen Sie es in einer Minute erneut.',
                               zh: 'LTA目前没有返回任何检查站摄像头画面——请稍后再试。',
                               ja: 'LTAは現在、検問所のカメラを返していません。1分後にもう一度お試しください。',
                               es: 'La LTA no ha devuelto ninguna cámara de control en este momento; inténtalo de nuevo en un minuto.'
                             },
  'transport.causeway.unreachable': { en: '🛂 Couldn’t reach LTA for checkpoint cameras — try again in a minute.',
                                      fr: '🛂 Impossible de joindre LTA pour les caméras de poste-frontière — réessayez dans une minute.' ,
                                     id: '🛂 Tidak dapat terhubung dengan LTA untuk kamera pos pemeriksaan — coba lagi dalam satu menit.',
                                     ru: '🛂 Не удалось связаться с LTA по поводу камер на контрольно-пропускных пунктах — попробуйте еще раз через минуту.',
                                     de: '🛂 LTA konnte bezüglich der Kontrollpunktkameras nicht erreicht werden – bitte versuchen Sie es in einer Minute erneut.',
                                     zh: '🛂 无法联系陆路交通管理局获取检查站摄像头信息——请稍后再试。',
                                     ja: '🛂 チェックポイントカメラについてLTAに接続できませんでした。1分後にもう一度お試しください。',
                                     es: '🛂 No se pudo contactar con LTA para obtener las cámaras de control; inténtalo de nuevo en un minuto.'
                                   },
  'transport.incidents.none':       { en: 'No live incidents reported.', fr: 'Aucun incident en direct signalé.' ,
                               id: 'Tidak ada insiden langsung yang dilaporkan.',
                               ru: 'Сообщений о происшествиях в режиме реального времени не поступало.',
                               de: 'Es wurden keine aktuellen Vorfälle gemeldet.',
                               zh: '暂无实时路况事件报告。',
                               ja: '現在発生中の交通障害の報告はありません。',
                               es: 'No se han registrado incidentes activos.'
                             },
  // v0.60.103 — uncapped: show every island-wide incident, sorted
  // nearest-first when location is shared.
  'transport.incidents.nearHeader': { en: 'Latest {n} traffic incidents island-wide:', fr: 'Derniers {n} incidents de circulation à l’échelle de l’île :' ,
                                     id: '{n} insiden lalu lintas terbaru di seluruh pulau:',
                                     ru: 'Последние {n} дорожных происшествий по всему острову:',
                                     de: 'Aktuelle {n} Verkehrsvorfälle inselweit:',
                                     zh: '全岛最新{n}起交通事故：',
                                     ja: '島内で最新の交通障害{n}件：',
                                     es: 'Últimos {n} incidentes de tráfico en toda la isla:'
                                   },
  'transport.incidents.row':        { en: '· {type}{dist}', fr: '· {type}{dist}' ,
                              id: '· {type}{dist}',
                              ru: '· {type}{dist}',
                              de: '· {type}{dist}',
                              zh: '· {type}{dist}',
                              ja: '・{type}{dist}',
                              es: '· {type}{dist}'
                            },
  'transport.incidents.noNear':     { en: '{total} incidents island-wide; none within 20 km of your location.', fr: '{total} incidents dans tout le pays ; aucun à moins de 20 km de votre position.' ,
                                 id: '{total} insiden di seluruh pulau; tidak ada dalam radius 20 km dari lokasi Anda.',
                                 ru: '{total} инцидентов по всему острову; ни одного в радиусе 20 км от вашего местоположения.',
                                 de: '{total} Vorfälle inselweit; keiner im Umkreis von 20 km um Ihren Standort.',
                                 zh: '全岛共发生{total}起事件；您所在位置 20 公里范围内没有发生事件。',
                                 ja: '島内で{total}件の交通障害。現在地から20km圏内では発生していません。',
                                 es: '{total} incidentes en toda la isla; ninguno en un radio de 20 km de tu ubicación.'
                               },
  'transport.incidents.noLoc':      { en: '{total} incidents island-wide. Share your location for nearest-first sorting.', fr: '{total} incidents dans tout le pays. Partagez votre position pour un tri par proximité.' ,
                                id: '{total} insiden di seluruh pulau. Bagikan lokasi Anda untuk pengurutan terdekat terlebih dahulu.',
                                ru: '{total} инцидентов по всему острову. Укажите местоположение, чтобы отсортировать по близости.',
                                de: '{total} Vorfälle inselweit. Teilen Sie Ihren Standort, damit die Ergebnisse nach Nähe sortiert werden können.',
                                zh: '全岛共发生{total}起事件。请分享您的位置，以便我们优先显示距离最近的事件。',
                                ja: '島内で{total}件の交通障害。現在地を共有していただくと、最寄りのものを優先的に表示します。',
                                es: '{total} incidentes en toda la isla. Comparte tu ubicación para ordenarlos por proximidad.'
                              },
  'transport.incidents.unreachable':{ en: 'Sorry, the traffic feed failed.', fr: 'Désolé, le flux de circulation a échoué.' ,
                                      id: 'Maaf, umpan lalu lintas mengalami kegagalan.',
                                      ru: 'Извините, передача данных о дорожной ситуации не удалась.',
                                      de: 'Leider ist der Verkehrsdaten-Feed ausgefallen.',
                                      zh: '抱歉，交通信息流传输失败。',
                                      ja: '申し訳ありませんが、交通情報フィードの取得に失敗しました。',
                                      es: 'Lo sentimos, no se han podido obtener los datos de tráfico.'
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
                                  id: '🚦 Lalu lintas ({n} teratas dari {total} di seluruh pulau):',
                                  ru: '🚦 Дорожная обстановка (топ-{n} из {total} по всему острову):',
                                  de: '🚦 Verkehr (Top {n} von {total} inselweit):',
                                  zh: '🚦 路况（全岛 {total} 起中的前 {n} 起）：',
                                  ja: '🚦 交通障害（島内{total}件のうち上位{n}件）：',
                                  es: '🚦 Tráfico (los {n} principales de {total} en toda la isla):'
                                },
  'transport.drive.trafficNoNear':  { en: '🚦 Traffic: {total} incidents island-wide; none within 5 km.', fr: '🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km.' ,
                                    id: '🚦 Lalu lintas: {total} insiden di seluruh pulau; tidak ada dalam radius 5 km.',
                                    ru: '🚦 Дорожная ситуация: {total} инцидентов по всему острову; ни одного в радиусе 5 км.',
                                    de: '🚦 Verkehr: {total} Vorfälle inselweit; keine im Umkreis von 5 km.',
                                    zh: '🚦 路况：全岛共 {total} 起事件；5 公里范围内无事件。',
                                    ja: '🚦 交通障害：島内{total}件。5km圏内はなし。',
                                    es: '🚦 Tráfico: {total} incidentes en toda la isla; ninguno en un radio de 5 km.'
                                  },
  'transport.drive.trafficNone':    { en: '🚦 Traffic: no live incidents reported.', fr: '🚦 Circulation : aucun incident en direct signalé.' ,
                                  id: '🚦 Lalu lintas: tidak ada insiden langsung yang dilaporkan.',
                                  ru: '🚦 Дорожная обстановка: происшествий не зарегистрировано.',
                                  de: '🚦 Verkehr: Keine aktuellen Vorfälle gemeldet.',
                                  zh: '🚦 路况：暂无实时事件报告。',
                                  ja: '🚦 交通障害：現在発生中の報告はありません。',
                                  es: '🚦 Tráfico: no se han registrado incidentes activos.'
                                },
  'transport.drive.openMapsBtn':    { en: 'Google Map ↗', fr: 'Google Map ↗' ,
                                  id: 'Google Maps ↗',
                                  ru: 'Google Maps ↗',
                                  de: 'Google Maps ↗',
                                  zh: '谷歌地图 ↗',
                                  ja: 'Googleマップ ↗',
                                  es: 'Google Maps ↗'
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
                                  ru: '🅿️ Парковка',
                                  de: '🅿️ Parkplatz',
                                  zh: '🅿️ 停车场',
                                  ja: '🅿️ 駐車場',
                                  es: '🅿️ Aparcamiento'
                                },
  'transport.drive.unreachable':    { en: 'Sorry, the drive view failed.', fr: 'Désolé, la vue voiture a échoué.' ,
                                  id: 'Maaf, tampilan mengemudi gagal dimuat.',
                                  ru: 'Извините, не удалось загрузить раздел «Вождение».',
                                  de: 'Die Fahransicht konnte leider nicht geladen werden.',
                                  zh: '抱歉，驾车信息加载失败。',
                                  ja: '申し訳ありませんが、ドライブ情報の取得に失敗しました。',
                                  es: 'Lo sentimos, no se ha podido cargar la vista de conducción.'
                                },

  // /forgetme
  'forgetme.nothing':          { en: '✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.)', fr: '✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.)' ,
                       id: '✅ Tidak ada yang perlu dihapus — Saya tidak memiliki data yang tersimpan untuk Anda. (Cache dan baris permintaan akan kedaluwarsa secara otomatis; semua slot persisten kosong.)',
                       ru: '✅ Удалять нечего — у меня не было сохраненных данных о вас. (Кэш и строки запросов автоматически удаляются; все постоянные слоты оказались пустыми.)',
                       de: '✅ Nichts zu löschen – ich hatte keine gespeicherten Daten für Sie. (Caches und Anforderungszeilen laufen automatisch ab; die persistenten Speicherplätze waren alle leer.)',
                       zh: '✅ 无需删除任何数据——我没有存储任何关于您的数据。（缓存和请求行会自动过期；持久化存储槽均为空。）',
                       ja: '✅ 消去するものはありません — お客様のために保存されたデータはありませんでした。（キャッシュとリクエスト行は自動的に期限切れになります。永続スロットはすべて空でした。）',
                       es: '✅ No hay nada que borrar: no tenía datos almacenados sobre ti. (Las cachés y las filas de solicitudes caducan automáticamente; todos los espacios persistentes estaban vacíos).'
                     },
  'forgetme.eraseHeader':      { en: '✅ Erased *{n}* Redis entry for your chat.', fr: '✅ {n} entrée Redis effacée pour votre conversation.' ,
                           id: '✅ Entri Redis *{n}* dihapus untuk obrolan Anda.',
                           ru: '✅ Удалена *{n}* запись Redis для вашего чата.',
                           de: '✅ *{n}* Redis-Eintrag für Ihren Chat gelöscht.',
                           zh: '✅ 已删除您聊天的 *{n}* 条 Redis 记录。',
                           ja: '✅ チャットの Redis エントリを *{n}* 件削除しました。',
                           es: '✅ Se borró *{n}* entrada de Redis de tu chat.'
                         },
  'forgetme.eraseHeaderMany':  { en: '✅ Erased *{n}* Redis entries for your chat.', fr: '✅ {n} entrées Redis effacées pour votre conversation.' ,
                               id: '✅ Entri Redis *{n}* dihapus untuk obrolan Anda.',
                               ru: '✅ Удалено *{n}* записей Redis для вашего чата.',
                               de: '✅ *{n}* Redis-Einträge für Ihren Chat gelöscht.',
                               zh: '✅ 已删除您聊天的 *{n}* 条 Redis 记录。',
                               ja: '✅ チャットの Redis エントリを *{n}* 件削除しました。',
                               es: '✅ Se borraron *{n}* entradas de Redis de tu chat.'
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
                       zh: '……以及另外 {n} 条',
                       ja: '…ほか{n}件',
                       es: '…y {n} más'
                     },
  'forgetme.followup':         { en: 'Send any command to start fresh. Recent picks and your last shared location are gone.', fr: 'Envoyez n’importe quelle commande pour repartir à neuf. Vos choix récents et votre dernière position partagée ont été effacés.' ,
                        id: 'Kirim perintah apa pun untuk memulai dari awal. Pilihan terbaru dan lokasi terakhir yang Anda bagikan sudah hilang.',
                        ru: 'Отправьте любую команду, чтобы начать заново. Недавние подборки и последнее местоположение, которым вы делились, удалены.',
                        de: 'Senden Sie einen beliebigen Befehl, um von vorne zu beginnen. Ihre letzten Auswahlen und Ihr zuletzt geteilter Standort sind gelöscht.',
                        zh: '发送任意命令即可重新开始。最近的选择和上次分享的位置都已清除。',
                        ja: '最初からやり直すには、任意のコマンドを送信してください。最近のおすすめと最後に共有した場所は削除済みです。',
                        es: 'Envía cualquier comando para empezar de cero. Tus selecciones recientes y tu última ubicación compartida se han eliminado.'
                      },
  'forgetme.error':            { en: 'Sorry, /forgetme hit an error. Try again in a moment, or DM the operator.', fr: 'Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur.' ,
                     id: 'Maaf, /forgetme mengalami kesalahan. Coba lagi sebentar lagi, atau kirim pesan pribadi ke operator.',
                     ru: 'Извините, команда /forgetme выдала ошибку. Попробуйте еще раз через минуту или напишите оператору в личные сообщения.',
                     de: 'Entschuldigung, /forgetme ist auf einen Fehler gestoßen. Versuchen Sie es gleich erneut oder kontaktieren Sie den Betreiber per Direktnachricht.',
                     es: 'Lo sentimos, /forgetme ha dado un error. Inténtalo de nuevo en un momento o envía un mensaje directo al operador.'
                   ,
                     zh: '抱歉，/forgetme 出错了。请稍后再试，或私信运营者。',
                     ja: '申し訳ありません、/forgetme でエラーが発生しました。しばらくしてからもう一度お試しいただくか、オペレーターにDMを送ってください。'
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
                    },
  'language.btn.fr':           { en: '🇫🇷 Français', fr: '🇫🇷 Français' ,
                    },
  // v0.62.480 — flag + endonym (native name) so a speaker recognises their
  // own language whatever the prompt locale. Same string in both en/fr keys.
  'language.btn.id':           { en: '🇮🇩 Indonesia', fr: '🇮🇩 Indonesia' ,
                    },
  'language.btn.ru':           { en: '🇷🇺 Русский', fr: '🇷🇺 Русский' ,
                    },
  'language.btn.de':           { en: '🇩🇪 Deutsch', fr: '🇩🇪 Deutsch' ,
                    },
  'language.btn.zh':           { en: '🇨🇳 中文', fr: '🇨🇳 中文' ,
                    },
  'language.btn.ja':           { en: '🇯🇵 日本語', fr: '🇯🇵 日本語' ,
                    },
  'language.btn.es':           { en: '🇪🇸 Español', fr: '🇪🇸 Español' ,
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
  'start.intro':               {
    en: 'Hungry for something beyond the usual? Soleat — “Solo eats” / “So let’s eat” — helps you explore Singapore’s {cuisines} cuisine melting pot — and other cities — with {cuisine-venues} curated venues, hawkers, Michelin Star picks, Bib Gourmand favourites under S$45, weather, and transport in one Telegram guide. Start with /c /cuisine or /m /menu\n\n/cuisine   — full Cuisine Picker (over {cuisines} cuisines, {cuisine-venues} curated venues, SG, Johor Bahru + other cities, 6 quick filters)\n/hawker    — >{hawker} hawker centres (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table\n/l /location — share or set your current location\n/weather   — now + 2-hour NEA forecast\n/transport — bus, MRT, walk, drive\n/carpark   — nearest 5 with available lots\n/language  — app language · 8 options (chat stays EN/FR)\n/privacy   — data, retention & sources\n/legal     — disclaimer & jurisdiction notes\n/forgetme  — erase your stored data\n\nOr tap the menu button (🍴 Cuisine Picker) to jump straight in.',
    fr: 'Envie de sortir des plats habituels ? Soleat — « Solo eats » / « So let’s eat » — vous aide à explorer plus de {cuisines} cuisines à Singapour — et d’autres villes — avec {cuisine-venues} adresses sélectionnées, hawkers, adresses Michelin, Bib Gourmand à moins de 45 S$, météo et transport dans Telegram. Commencez avec /c /cuisine ou /m /menu\n\n/cuisine   — Sélecteur Cuisine complet (plus de {cuisines} cuisines, {cuisine-venues} adresses sélectionnées, SG, Johor Bahru + autres villes, 6 filtres rapides)\n/hawker    — plus de {hawker} centres hawkers (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Producteurs locaux\n/l /location — partager ou définir votre position actuelle\n/weather   — maintenant + prévisions 2 h NEA\n/transport — bus, MRT, marche, voiture\n/carpark   — 5 parkings proches avec places\n/language  — langue de l’app · 8 options (chat en FR/EN)\n/privacy   — données, conservation et sources\n/legal     — clauses et juridiction\n/forgetme  — effacer vos données enregistrées\n\nOu touchez le bouton menu (🍴 Sélecteur Cuisine) pour démarrer directement.',
    id: 'Ingin sesuatu di luar yang biasa? Soleat — “Solo eats” / “So let’s eat” — membantu Anda menjelajahi peleburan {cuisines} masakan Singapura — dan kota lain — dengan {cuisine-venues} tempat pilihan, hawker, rekomendasi Michelin Star, favorit Bib Gourmand di bawah S$45, cuaca, dan transportasi dalam satu panduan Telegram. Mulai dengan /c /cuisine atau /m /menu\n\n/cuisine — Cuisine Picker lengkap (lebih dari {cuisines} masakan, {cuisine-venues} tempat pilihan, SG, Johor Bahru + kota lain, 6 filter cepat)\n/hawker — >{hawker} pusat jajanan (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Produk Lokal ke Meja\n/l /location — bagikan atau atur lokasi Anda saat ini\n/weather — sekarang + prakiraan NEA 2 jam\n/transport — bus, MRT, jalan kaki, berkendara\n/carpark — 5 terdekat dengan slot kosong\n/language — bahasa aplikasi · 8 pilihan (obrolan tetap EN/FR)\n/privacy — data, retensi & sumber\n/legal — penafian & catatan yurisdiksi\n/forgetme — hapus data tersimpan Anda\n\nAtau ketuk tombol menu (🍴 Cuisine Picker) untuk langsung mulai.',
    ru: 'Хочется чего-то за пределами привычного? Soleat — «Solo eats» / «So let’s eat» — помогает исследовать кулинарный плавильный котёл Сингапура из {cuisines} кухонь — и другие города — с {cuisine-venues} отобранными заведениями, хокерами, местами со звездой Michelin, фаворитами Bib Gourmand дешевле S$45, погодой и транспортом в одном гиде Telegram. Начните с /c /cuisine или /m /menu\n\n/cuisine — полный Cuisine Picker (более {cuisines} кухонь, {cuisine-venues} отобранных заведений, SG, Джохор-Бару и другие города, 6 быстрых фильтров)\n/hawker — >{hawker} хокер-центров (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, местные продукты\n/l /location — поделиться или задать текущее местоположение\n/weather — сейчас + прогноз NEA на 2 часа\n/transport — автобус, MRT, пешком, за рулём\n/carpark — 5 ближайших парковок со свободными местами\n/language — язык приложения · 8 вариантов (чат остаётся EN/FR)\n/privacy — данные, хранение и источники\n/legal — оговорки и юрисдикция\n/forgetme — удалить сохранённые данные\n\nИли нажмите кнопку меню (🍴 Cuisine Picker), чтобы начать сразу.',
    de: 'Lust auf etwas jenseits des Üblichen? Soleat — „Solo eats“ / „So let’s eat“ — hilft Ihnen, Singapurs Schmelztiegel aus {cuisines} Küchen zu erkunden — und andere Städte — mit {cuisine-venues} kuratierten Adressen, Hawkern, Michelin-Stern-Tipps, Bib-Gourmand-Favoriten unter S$45, Wetter und Verkehr in einem Telegram-Guide. Starten Sie mit /c /cuisine oder /m /menu\n\n/cuisine — vollständiger Cuisine Picker (über {cuisines} Küchen, {cuisine-venues} kuratierte Adressen, SG, Johor Bahru + weitere Städte, 6 Schnellfilter)\n/hawker — >{hawker} Hawker-Zentren (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, regionale Produkte\n/l /location — Standort teilen oder festlegen\n/weather — jetzt + 2-Stunden-Prognose der NEA\n/transport — Bus, MRT, zu Fuß, Auto\n/carpark — die 5 nächsten mit freien Plätzen\n/language — App-Sprache · 8 Optionen (Chat bleibt EN/FR)\n/privacy — Daten, Speicherdauer & Quellen\n/legal — Haftungsausschluss & Gerichtsstand\n/forgetme — gespeicherte Daten löschen\n\nOder tippen Sie auf die Menü-Schaltfläche (🍴 Cuisine Picker), um direkt loszulegen.',
    zh: '想吃点不一样的？Soleat —— “Solo eats” / “So let’s eat” —— 带您探索新加坡 {cuisines} 种菜系交融的美食版图，以及其他城市，收录 {cuisine-venues} 家精选餐馆、小贩中心、米其林星级推荐、45 新元以下的必比登推介，还有天气与交通，全在一个 Telegram 指南里。从 /c /cuisine 或 /m /menu 开始\n\n/cuisine — 完整的 Cuisine Picker（超过 {cuisines} 种菜系、{cuisine-venues} 家精选餐馆，新加坡、新山及其他城市，6 个快捷筛选）\n/hawker — >{hawker} 家小贩中心（2025）\n/recognised — 米其林、必比登推介、亚洲 50/100 佳、本地食材上桌\n/l /location — 分享或设置您当前的位置\n/weather — 当前天气 + NEA 未来 2 小时预报\n/transport — 公交、地铁、步行、驾车\n/carpark — 最近的 5 个有空位的停车场\n/language — 应用语言 · 8 种选择（聊天仍为 EN/FR）\n/privacy — 数据、保存期限与来源\n/legal — 免责声明与司法管辖说明\n/forgetme — 删除您已保存的数据\n\n或点击菜单按钮（🍴 Cuisine Picker）直接开始。',
    ja: 'いつもと違うものを食べたいですか？Soleat ——「Solo eats」/「So let’s eat」—— は、シンガポールの {cuisines} 種類の料理が交わる食の坩堝、そして他都市を、{cuisine-venues} 軒の厳選店、ホーカー、ミシュラン星付き、S$45 以下のビブグルマン、天気、交通とともに 1 つの Telegram ガイドで案内します。/c /cuisine または /m /menu から始めましょう\n\n/cuisine — フル機能の Cuisine Picker（{cuisines} 種類以上の料理、{cuisine-venues} 軒の厳選店、シンガポール、ジョホールバル＋他都市、6 つのクイックフィルター）\n/hawker — >{hawker} 軒のホーカーセンター（2025）\n/recognised — ミシュラン、ビブグルマン、アジア 50/100、地元産食材\n/l /location — 現在地を共有または設定\n/weather — 現在 + NEA の 2 時間予報\n/transport — バス、MRT、徒歩、車\n/carpark — 空きのある最寄り 5 か所\n/language — アプリの言語 · 8 種類（チャットは EN/FR のまま）\n/privacy — データ、保存期間、出典\n/legal — 免責事項と管轄について\n/forgetme — 保存データを削除\n\nまたはメニューボタン（🍴 Cuisine Picker）をタップしてすぐに始められます。',
    es: '¿Te apetece algo más allá de lo habitual? Soleat — «Solo eats» / «So let’s eat» — te ayuda a explorar el crisol de {cuisines} cocinas de Singapur — y otras ciudades — con {cuisine-venues} locales seleccionados, hawkers, recomendaciones con estrella Michelin, favoritos Bib Gourmand por menos de S$45, el tiempo y el transporte en una sola guía de Telegram. Empieza con /c /cuisine o /m /menu\n\n/cuisine — Cuisine Picker completo (más de {cuisines} cocinas, {cuisine-venues} locales seleccionados, SG, Johor Bahru + otras ciudades, 6 filtros rápidos)\n/hawker — >{hawker} centros de comida callejera (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, producto local en mesa\n/l /location — comparte o fija tu ubicación actual\n/weather — ahora + previsión NEA a 2 horas\n/transport — autobús, MRT, a pie, en coche\n/carpark — los 5 más cercanos con plazas libres\n/language — idioma de la app · 8 opciones (el chat sigue en EN/FR)\n/privacy — datos, conservación y fuentes\n/legal — aviso legal y jurisdicción\n/forgetme — borra tus datos guardados\n\nO toca el botón de menú (🍴 Cuisine Picker) para empezar directamente.'
  },

  // location flow
  'location.shareTap':         { en: '📍 Tap to share your current location.', fr: '📍 Touchez pour partager votre position actuelle.' ,
                        id: '📍 Ketuk untuk membagikan lokasi Anda saat ini.',
                        ru: '📍 Нажмите, чтобы поделиться своим текущим местоположением.',
                        de: '📍 Tippen Sie hier, um Ihren aktuellen Standort zu teilen.',
                        zh: '📍点击分享您的当前位置。',
                        ja: '📍 現在地を共有するにはタップしてください。',
                        es: '📍 Toca para compartir tu ubicación actual.'
                      },
  'location.got':              { en: '📍 Got your location.', fr: '📍 Position reçue.' ,
                   id: '📍 Lokasi Anda sudah diketahui.',
                   ru: '📍 Ваше местоположение определено.',
                   de: '📍 Wir haben Ihren Standort ermittelt.',
                   zh: '📍已获取您的位置。',
                   ja: '📍 現在地を取得しました。',
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
                             de: '📍 *Standort eingestellt auf:*\n{place}\n\n💻 Auf dem Desktop zeigt Telegram einen *gepinnten Punkt* auf einer Karte an, nicht das Live-GPS – es kann also vorkommen, dass der falsche Ort angezeigt wird. Befinden Sie sich hier?',
                             zh: '📍 *位置已设置为：*\n{place}\n\n💻 在电脑端，Telegram 分享的是地图上的标记点，而不是实时 GPS 定位——因此可能会定位到错误的位置。这是你所在的位置吗？',
                             ja: '📍 *位置情報を次に設定しました:*\n{place}\n\n💻 デスクトップ版の Telegram では、リアルタイムの GPS ではなく、*地図上にピン留めされた地点* が共有されます。そのため、間違った場所に表示される可能性があります。ここがあなたの現在地ですか?',
                             es: '📍 *Ubicación establecida en:*\n{place}\n\n💻 En la versión de escritorio, Telegram comparte un *punto marcado en el mapa*, no un GPS en tiempo real; puede ubicarse en un lugar incorrecto. ¿Es aquí donde estás?'
                           },
  'loc.confirm.yes':           { en: '✅ Yes, use it', fr: '✅ Oui, utiliser' ,
                      id: '✅ Ya, gunakanlah',
                      ru: '✅ Да, использовать',
                      de: '✅ Ja, verwenden',
                      zh: '✅ 是的，请使用它',
                      ja: '✅ はい、これを使う',
                      es: '✅ Sí, úsalo'
                    },
  'loc.confirm.no':            { en: '✏️ No, set manually', fr: '✏️ Non, saisir manuellement' ,
                     id: '✏️ Tidak, atur secara manual',
                     ru: '✏️ Нет, установить вручную',
                     de: '✏️ Nein, manuell einstellen',
                     zh: '✏️ 不，手动设置',
                     ja: '✏️ いいえ、手動で設定',
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
                            id: 'Ketik area Anda — misalnya `/l Orchard Road` atau `/l Bugis`. Di desktop, mengetik lebih andal daripada tombol berbagi.',
                            ru: 'Введите название вашего района — например `/l Orchard Road` или `/l Bugis`. На компьютере ввод текста более надежен, чем использование кнопки «Поделиться».',
                            de: 'Geben Sie Ihren Ort ein – z. B. `/l Orchard Road` oder `/l Bugis`. Auf dem Desktop ist die Eingabe zuverlässiger als die Teilen-Schaltfläche.',
                            zh: '输入您的区域，例如`/l Orchard Road`或`/l Bugis`。在电脑上，打字比使用分享按钮更可靠。',
                            ja: '地域名を入力してください（例：`/l Orchard Road`または`/l Bugis`）。デスクトップでは、共有ボタンよりも入力の方が確実です。',
                            es: 'Escribe tu zona; por ejemplo `/l Orchard Road` o `/l Bugis`. En ordenadores de sobremesa, escribir es más fiable que usar el botón de compartir.'
                          },
  'loc.desktopNudge':          {
    en: '💻 On desktop? Telegram shares a map-pick, not GPS. If this is wrong, type /l <your area>.',
    fr: '💻 Sur ordinateur ? Telegram partage un point sur carte, pas le GPS. Si c’est faux, tapez /l <votre lieu>.',
    id: '💻 Di desktop? Telegram membagikan titik peta, bukan GPS. Kalau ini salah, ketik /l <your area>.',
    ru: '💻 На компьютере? Telegram делится точкой на карте, а не GPS. Если это неверно, введите /l <your area>.',
    de: '💻 Auf dem Desktop? Telegram teilt eine Kartenposition, nicht GPS. Falls das falsch ist, gib /l <your area> ein.',
    zh: '💻 在电脑上？Telegram 分享的是地图上的点，不是 GPS。如果不对，请输入 /l <your area>。',
    ja: '💻 デスクトップですか？Telegram が共有するのは地図上の地点で、GPS ではありません。違う場合は /l <your area> と入力してください。',
    es: '💻 ¿En ordenador? Telegram comparte un punto del mapa, no el GPS. Si no es correcto, escribe /l <your area>.'
  },
  // v0.59.6: ensureLocation prompts (the "two messages" /hidden bug).
  'location.shareLabel':       {
    en: '📍 Share your location once so {label} uses your locale (or type `/location <place name>` to set it manually).',
    fr: '📍 Partagez votre position une fois pour que {label} utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).',
    id: '📍 Bagikan lokasi Anda sekali agar {label} memakai wilayah Anda (atau ketik `/location <place name>` untuk mengaturnya manual).',
    ru: '📍 Поделитесь местоположением один раз, чтобы {label} использовал ваш регион (или введите `/location <place name>`, чтобы задать вручную).',
    de: '📍 Teilen Sie Ihren Standort einmalig, damit {label} Ihre Region verwendet (oder geben Sie `/location <place name>` ein, um ihn manuell festzulegen).',
    zh: '📍 分享一次您的位置，以便 {label} 使用您的语言环境（或输入 `/location <place name>` 手动设置）。',
    ja: '📍 一度位置情報を共有すると、{label} であなたの地域設定が使用されます（または、`/location <place name>` を入力して手動で設定します）。',
    es: '📍 Comparte tu ubicación una vez para que {label} use tu región (o escribe `/location <place name>` para fijarla manualmente).'
  },
  'location.current':          { en: '📍 Current: {addr}{age}', fr: '📍 Actuel : {addr}{age}' ,
                       id: '📍 Alamat saat ini: {addr}{age}',
                       ru: '📍 Текущий адрес: {addr}{age}',
                       de: '📍 Aktuell: {addr}{age}',
                       zh: '📍 当前地址：{addr}{age}',
                       ja: '📍 現在地: {addr}{age}',
                       es: '📍 Actual: {addr}{age}'
                     },
  'location.age.justShared':   { en: ' (just shared)', fr: ' (à l’instant)' ,
                              id: ' (baru saja dibagikan)',
                              ru: ' (только что)',
                              de: ' (gerade geteilt)',
                              zh: '（刚刚分享）',
                              ja: '（共有したばかり）',
                              es: ' (recién compartido)'
                            },
  'location.age.minAgo':       { en: ' ({n} min ago)', fr: ' (il y a {n} min)' ,
                          id: ' ({n} menit yang lalu)',
                          ru: ' ({n} минут назад)',
                          de: ' (vor {n} Minuten)',
                          zh: '（{n}分钟前）',
                          ja: ' ({n}分前)',
                          es: ' (hace {n} minutos)'
                        },
  'location.age.hourAgo':      { en: ' ({h} h {m} min ago)', fr: ' (il y a {h} h {m} min)' ,
                           id: ' ({h} jam {m} menit yang lalu)',
                           ru: ' ({h} ч {m} мин назад)',
                           de: ' (vor {h} Std. {m} Min.)',
                           zh: '（{h}小时{m}分钟前）',
                           ja: ' ({h}時間{m}分前)',
                           es: ' (hace {h} h {m} min)'
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
                   ru: '✅ Остаться здесь',
                   de: '✅ Hier bleiben',
                   zh: '✅ 留在这里',
                   ja: '✅ ここのままにする',
                   es: '✅ Quedarme aquí'
                 },
  'wake.newBtn':               { en: '📍 New location', fr: '📍 Nouvelle position' ,
                  id: '📍 Lokasi baru',
                  ru: '📍 Новое местоположение',
                  de: '📍 Neuer Standort',
                  zh: '📍 新地点',
                  ja: '📍 新しい場所',
                  es: '📍 Nueva ubicación'
                },
  'wake.kept':                 { en: '👍 Keeping your saved location.', fr: '👍 Position enregistrée conservée.' ,
                id: '👍 Lokasi tersimpan Anda dipertahankan.',
                ru: '👍 Сохранённое местоположение оставлено.',
                de: '👍 Ihr gespeicherter Standort bleibt erhalten.',
                zh: '👍 已保留您保存的位置。',
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
  'wake2.body':                {
    en: '👋 <b>Welcome back to Soleat</b>\n\nYour device now appears to be near: <i>{deviceStreet}</i>\n\nSoleat is still using your saved search anchor:\n<b>{anchor}</b>\n\nContinue searching from the anchor, or update to your current location?\n\n<i>You can also type /l to search from another place, for example:\n/l Orchard Road\n/l IOI City Mall</i>',
    fr: '👋 <b>Content de vous revoir sur Soleat</b>\n\nVotre appareil semble être près de : <i>{deviceStreet}</i>\n\nSoleat utilise toujours votre point de recherche enregistré :\n<b>{anchor}</b>\n\nContinuer depuis ce point, ou utiliser votre position actuelle ?\n\n<i>Vous pouvez aussi taper /l pour chercher depuis un autre lieu, par exemple :\n/l Orchard Road\n/l IOI City Mall</i>',
    id: '👋 <b>Selamat datang kembali di Soleat</b>\n\nPerangkat Anda tampaknya berada di dekat: <i>{deviceStreet}</i>\n\nSoleat masih memakai titik acuan pencarian tersimpan Anda:\n<b>{anchor}</b>\n\nLanjutkan mencari dari titik acuan, atau perbarui ke lokasi Anda saat ini?\n\n<i>Anda juga bisa mengetik /l untuk mencari dari tempat lain, misalnya:\n/l Orchard Road\n/l IOI City Mall</i>',
    ru: '👋 <b>Добро пожаловать обратно в Soleat</b>\n\nВаше устройство, похоже, находится рядом с: <i>{deviceStreet}</i>\n\nSoleat по-прежнему использует сохраненный вами якорь поиска:\n<b>{anchor}</b>\n\nПродолжить поиск с указанной точки или обновить данные, указав текущее местоположение?\n\n<i>Вы также можете ввести /l для поиска из другого места, например:\n/l Орчард Роуд\n/l Торговый центр IOI City Mall</i>',
    de: '👋 <b>Willkommen zurück bei Soleat</b>\n\nIhr Gerät befindet sich nun in der Nähe von: <i>{deviceStreet}</i>\n\nSoleat verwendet weiterhin Ihren gespeicherten Suchanker:\n<b>{anchor}</b>\n\nSuche vom Ausgangspunkt aus fortsetzen oder zu Ihrem aktuellen Standort wechseln?\n\n<i>Sie können auch /l eingeben, um von einem anderen Ort aus zu suchen, zum Beispiel:\n/l Orchard Road\n/l IOI City Mall</i>',
    zh: '👋 <b>欢迎回到 Soleat</b>\n\n您的设备现在似乎位于：<i>{deviceStreet}</i>\n\nSoleat 仍在使用您保存的搜索锚点：\n<b>{anchor}</b>\n\n继续从锚点搜索，还是更新到您当前的位置？\n\n<i>您也可以输入 /l 从其他位置进行搜索，例如：\n/l 乌节路\n/l IOI City Mall</i>',
    ja: '👋 <b>Soleatへようこそ</b>\n\nお使いのデバイスは現在、<i>{deviceStreet}</i>付近にあります。\n\nSoleatは、保存済みの検索アンカーをまだ使用しています。\n<b>{anchor}</b>\n\nアンカー地点から検索を続けるか、現在地へ更新するか？\n\n<i>また、/l と入力して別の場所から検索することもできます。例:\n/l Orchard Road\n/l IOI City Mall</i>',
    es: '👋 <b>Bienvenido de nuevo a Soleat</b>\n\nTu dispositivo ahora parece estar cerca de: <i>{deviceStreet}</i>\n\nSoleat sigue utilizando el ancla de búsqueda guardada:\n<b>{anchor}</b>\n\n¿Continuar la búsqueda desde el ancla o actualizar a tu ubicación actual?\n\n<i>También puedes escribir /l para buscar desde otro lugar, por ejemplo:\n/l Orchard Road\n/l IOI City Mall</i>'
  },
  'wake2.btnCurrent':          { en: '📍 Use current location', fr: '📍 Position actuelle' ,
                       id: '📍 Gunakan lokasi saat ini',
                       ru: '📍 Использовать текущее местоположение',
                       de: '📍 Aktuellen Standort verwenden',
                       zh: '📍 使用当前位置',
                       ja: '📍 現在地を使用',
                       es: '📍 Usar ubicación actual'
                     },
  'wake2.btnKeep':             { en: '✅ Keep earlier location', fr: '✅ Garder le précédent' ,
                    id: '✅ Pertahankan lokasi sebelumnya',
                    ru: '✅ Оставить прежнее местоположение',
                    de: '✅ Früheren Standort beibehalten',
                    zh: '✅ 保留先前的位置',
                    ja: '✅ 以前の場所を保持する',
                    es: '✅ Mantener la ubicación anterior'
                  },
  'wake2.btnAnother':          { en: '🗺 Set another location', fr: '🗺 Définir un autre lieu' ,
                       id: '🗺 Tetapkan lokasi lain',
                       ru: '🗺 Указать другое местоположение',
                       de: '🗺 Einen anderen Standort festlegen',
                       zh: '🗺 设置其他位置',
                       ja: '🗺 別の場所を設定する',
                       es: '🗺 Establecer otra ubicación'
                     },
  'wake2.currentApplied':      { en: '👍 Anchor updated to <i>{street}</i>.', fr: '👍 Point mis à jour vers <i>{street}</i>.' ,
                           id: '👍 Titik acuan pencarian diperbarui ke <i>{street}</i>.',
                           ru: '👍 Якорь обновлен до <i>{street}</i>.',
                           de: '👍 Anker aktualisiert auf <i>{street}</i>.',
                           zh: '👍 锚点已更新为 <i>{street}</i>。',
                           ja: '👍 アンカーを <i>{street}</i> に更新しました。',
                           es: '👍 Ancla actualizada a <i>{street}</i>.'
                         },
  'wake2.kept':                { en: '👍 Keeping your saved search anchor.', fr: '👍 Point de recherche conservé.' ,
                 id: '👍 Titik acuan pencarian tersimpan Anda dipertahankan.',
                 ru: '👍 Сохранённый якорь поиска оставлен.',
                 de: '👍 Ihr gespeicherter Suchanker bleibt erhalten.',
                 zh: '👍 保留您保存的搜索锚点。',
                 ja: '👍 保存した検索アンカーを保持します。',
                 es: '👍 Conservando tu ancla de búsqueda guardada.'
               },
  'wake2.anotherHint':         {
    en: 'Type /l <place> to set a new anchor — for example /l Orchard Road or /l IOI City Mall. Or tap 📍 below to share a fresh GPS location.',
    fr: 'Tapez /l <lieu> pour définir un nouveau point — par exemple /l Orchard Road ou /l IOI City Mall. Ou touchez 📍 ci-dessous pour partager une position GPS fraîche.',
    id: 'Ketik /l <place> untuk menetapkan titik acuan baru — misalnya /l Orchard Road atau /l IOI City Mall. Atau ketuk 📍 di bawah untuk membagikan lokasi GPS terbaru.',
    ru: 'Введите /l <place>, чтобы задать новый якорь — например /l Orchard Road или /l IOI City Mall. Либо нажмите 📍 ниже, чтобы отправить свежие GPS-координаты.',
    de: 'Tippe /l <place>, um einen neuen Anker zu setzen — zum Beispiel /l Orchard Road oder /l IOI City Mall. Oder tippe unten auf 📍, um einen frischen GPS-Standort zu teilen.',
    zh: '输入 /l <place> 即可设置新的锚点 — 例如 /l Orchard Road 或 /l IOI City Mall。也可以点击下方的 📍 分享最新的 GPS 位置。',
    ja: '/l <place> と入力すると新しいアンカーを設定できます — 例: /l Orchard Road や /l IOI City Mall。または下の 📍 をタップして最新の GPS 位置を共有してください。',
    es: 'Escribe /l <place> para fijar una nueva ancla — por ejemplo /l Orchard Road o /l IOI City Mall. O toca 📍 abajo para compartir una ubicación GPS nueva.'
  },
  'wake2.offerExpired':        {
    en: '⏱ That share expired. Tap /l to set a new anchor.',
    fr: '⏱ Ce partage a expiré. Tapez /l pour définir un nouveau point.',
    id: '⏱ Berbagi lokasi tersebut telah kedaluwarsa. Ketuk /l untuk mengatur titik acuan baru.',
    ru: '⏱ Срок действия этой публикации истек. Нажмите /l, чтобы установить новый якорь.',
    de: '⏱ Diese Freigabe ist abgelaufen. Tippen Sie auf /l, um einen neuen Anker festzulegen.',
    zh: '⏱ 该共享已过期。点击 /l 设置新的锚点。',
    ja: '⏱ その共有は期限切れです。/l をタップして新しいアンカーを設定してください。',
    es: '⏱ Esa ubicación compartida ha caducado. Pulsa /l para establecer una nueva ancla.'
  },

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' ,
                                     id: '🗺 Lihat {n} insiden di satu peta:',
                                     ru: '🗺 Отобразить {n} инцидентов на одной карте:',
                                     de: '🗺 {n} Vorfälle auf einer Karte anzeigen:',
                                     zh: '🗺 在一张地图上查看{n}起事件：',
                                     ja: '🗺 1つの地図で{n}件の交通障害を表示：',
                                     es: '🗺 Visualiza {n} incidentes en un solo mapa:'
                                   },
  'transport.map.incidentsBtn':     { en: 'Show {n} incidents on the Map', fr: 'Afficher {n} incidents sur la carte' ,
                                 id: 'Tampilkan {n} insiden pada Peta',
                                 ru: 'Показать {n} инцидентов на карте',
                                 de: '{n} Vorfälle auf der Karte anzeigen',
                                 zh: '在地图上显示{n}起事件',
                                 ja: '地図上に{n}件の交通障害を表示',
                                 es: 'Mostrar {n} incidentes en el mapa'
                               },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' ,
                                    id: '🗺 Lihat {n} halte bus dalam satu peta:',
                                    ru: '🗺 Посмотреть {n} автобусных остановок на одной карте:',
                                    de: '🗺 {n} Bushaltestellen auf einer Karte anzeigen:',
                                    zh: '🗺 在一张地图上查看{n}个公交车站：',
                                    ja: '🗺 1つの地図上に{n}個のバス停を表示：',
                                    es: '🗺 Visualiza {n} paradas de autobús en un solo mapa:'
                                  },
  // v0.60.61 — relabelled per Human Lead. Standardise on the 🚏
  // bus-stop emoji + drop the literal "on map" suffix (it's
  // implied by the button context).
  'transport.map.busStopsBtn':      { en: 'Show all {n} bus stops', fr: 'Voir les {n} arrêts de bus' ,
                                id: 'Tampilkan semua {n} halte bus',
                                ru: 'Показать все {n} автобусных остановок',
                                de: 'Alle {n} Bushaltestellen anzeigen',
                                zh: '显示全部 {n} 个公交车站',
                                ja: '{n}件のバス停をすべて表示',
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
                                id: 'Lihat {n} Stasiun Kereta',
                                ru: 'Показать {n} станций метро',
                                de: '{n} MRT-Stationen anzeigen',
                                zh: '查看 {n} 个地铁站',
                                ja: '{n}件の駅を表示',
                                es: 'Ver {n} estaciones de tren'
                              },

  // Distance row addition for MRT stations (was previously bare).
  // v0.60.72 — per-station row carries an HTML <a> wrapping the
  // station name. The link opens Google Maps' transit detail panel
  // (the operator's "incorporate" ask 2026-05-10): tapping it lands
  // on the station's place sheet with live arrival times. The chat
  // send is HTML parse_mode (see runTransportTrain in index.js).
  'transport.train.stationRow':     { en: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>', fr: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>' ,
                                 id: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 ru: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 de: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 zh: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 ja: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 es: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>'
                               },

  // v0.59.4 — /hidden chrome localisation.
  'hidden.busy':                  {
    en: '⏳ Soleat is still working on your last request — hold on a moment.',
    fr: '⏳ Soleat traite encore votre dernière demande — un instant.',
    id: '⏳ Soleat masih memproses permintaan terakhir Anda — mohon tunggu sebentar.',
    ru: '⏳ Soleat всё ещё обрабатывает ваш последний запрос — подождите немного.',
    de: '⏳ Soleat arbeitet noch an Ihrer letzten Anfrage – einen Moment bitte.',
    zh: '⏳ Soleat 仍在处理您的上一个请求——请稍等片刻。',
    ja: '⏳ Soleat は前回のリクエストをまだ処理中です。少々お待ちください。',
    es: '⏳ Soleat sigue trabajando en tu última solicitud; espera un momento.'
  },
  'hidden.huntingLegacy':         {
    en: '🎲 Hunting for one hidden gem 1.5–3 km away…',
    fr: '🎲 À la recherche d’un trésor caché à 1,5–3 km…',
    id: '🎲 Mencari satu permata tersembunyi berjarak 1,5–3 km…',
    ru: '🎲 Ищу одну скрытую жемчужину в 1,5–3 км отсюда…',
    de: '🎲 Suche nach einem versteckten Juwel in 1,5–3 km Entfernung…',
    zh: '🎲 正在寻找 1.5–3 公里外的一处隐藏宝藏…',
    ja: '🎲 1.5〜3 km 先の隠れた名店を探しています…',
    es: '🎲 Buscando una joya escondida a 1,5–3 km…'
  },
  'hidden.legacyNotFound':        {
    en: 'Soleat couldn\'t find a hidden gem in your annulus. Try moving area or open /cuisine.',
    fr: 'Soleat n’a pas trouvé de trésor dans votre zone. Essayez ailleurs ou ouvrez /cuisine.',
    id: 'Soleat tidak menemukan permata tersembunyi di radius itu. Coba pindah area atau buka /cuisine.',
    ru: 'Soleat не нашёл скрытых жемчужин в этом кольце. Попробуйте другой район или откройте /cuisine.',
    de: 'Soleat hat in Ihrem Umkreis kein verstecktes Juwel gefunden. Versuchen Sie eine andere Gegend oder öffnen Sie /cuisine.',
    zh: 'Soleat 在该范围内没有找到隐藏宝藏。换个区域试试，或打开 /cuisine。',
    ja: 'Soleat はこの範囲で隠れた名店を見つけられませんでした。エリアを変えるか /cuisine を開いてください。',
    es: 'Soleat no encontró ninguna joya escondida en esa franja. Prueba en otra zona o abre /cuisine.'
  },
  'hidden.anchorAmbiguous':       {
    en: 'I couldn\'t pinpoint your area{anchor}. Type the building or area you\'re at — for example \'Raffles Place MRT Exit A\' or \'Holland Village\' — and I\'ll re-anchor /hidden.',
    fr: 'Je n’ai pas pu cerner votre zone{anchor}. Tapez le bâtiment ou le quartier où vous êtes — par exemple « Raffles Place MRT Exit A » ou « Holland Village » — et je ré-ancrerai /hidden.',
    id: 'Saya tidak bisa memastikan area Anda{anchor}. Ketik nama gedung atau kawasan tempat Anda berada — misalnya \'Raffles Place MRT Exit A\' atau \'Holland Village\' — dan saya akan menetapkan ulang acuan /hidden.',
    ru: 'Не удалось точно определить ваш район{anchor}. Введите здание или район, где вы находитесь — например «Raffles Place MRT Exit A» или «Holland Village» — и я перенастрою /hidden.',
    de: 'Ich konnte Ihre Gegend nicht genau bestimmen{anchor}. Tippen Sie das Gebäude oder Viertel ein, in dem Sie sich befinden — zum Beispiel „Raffles Place MRT Exit A“ oder „Holland Village“ — und ich verankere /hidden neu.',
    zh: '我无法确定您所在的区域{anchor}。请输入您所在的建筑或地区 — 例如“Raffles Place MRT Exit A”或“Holland Village” — 我会重新锚定 /hidden。',
    ja: 'エリアを特定できませんでした{anchor}。今いる建物または地区を入力してください — 例:「Raffles Place MRT Exit A」や「Holland Village」 — /hidden を再設定します。',
    es: 'No pude precisar tu zona{anchor}. Escribe el edificio o barrio en el que estás — por ejemplo «Raffles Place MRT Exit A» u «Holland Village» — y volveré a anclar /hidden.'
  },
  'hidden.anchorAmbiguous.got':   {
    en: ' (got "{name}")',
    fr: ' (reçu : « {name} »)',
    id: ' (diterima "{name}")',
    ru: ' (получено «{name}»)',
    de: ' (erhalten: „{name}“)',
    zh: '（收到“{name}”）',
    ja: '（「{name}」を受信）',
    es: ' (recibido «{name}»)'
  },
  'hidden.searching':             {
    en: '🔍 Searching hidden gems near {anchor}… please wait.',
    fr: '🔍 Recherche de trésors près de {anchor}… veuillez patienter.',
    id: '🔍 Mencari permata tersembunyi di dekat {anchor}… mohon tunggu.',
    ru: '🔍 Ищу скрытые жемчужины рядом с {anchor}… пожалуйста, подождите.',
    de: '🔍 Suche versteckte Juwelen in der Nähe von {anchor}… bitte warten.',
    zh: '🔍 正在 {anchor} 附近寻找隐藏宝藏…请稍候。',
    ja: '🔍 {anchor} 周辺の隠れた名店を検索中…お待ちください。',
    es: '🔍 Buscando joyas escondidas cerca de {anchor}… espera un momento.'
  },
  'hidden.progress.1':            {
    en: '⏳ Still searching… cross-referencing recent food blogs and IG posts.',
    fr: '⏳ Recherche en cours… recoupement des blogs et posts IG récents.',
    id: '⏳ Masih mencari… menyilangkan blog kuliner dan unggahan IG terbaru.',
    ru: '⏳ Всё ещё ищу… сверяю свежие фуд-блоги и посты в IG.',
    de: '⏳ Suche läuft… gleiche aktuelle Food-Blogs und IG-Posts ab.',
    zh: '⏳ 仍在搜索…正在比对近期美食博客与 IG 帖子。',
    ja: '⏳ まだ検索中…最近のフードブログと IG 投稿を照合しています。',
    es: '⏳ Sigo buscando… cruzando blogs gastronómicos y publicaciones de IG recientes.'
  },
  'hidden.progress.2':            {
    en: '⏳ Verifying source quality…',
    fr: '⏳ Vérification de la qualité des sources…',
    id: '⏳ Memverifikasi kualitas sumber…',
    ru: '⏳ Проверяю качество источников…',
    de: '⏳ Prüfe die Qualität der Quellen…',
    zh: '⏳ 正在核验来源质量…',
    ja: '⏳ 情報源の信頼性を確認中…',
    es: '⏳ Verificando la calidad de las fuentes…'
  },
  'hidden.progress.3':            {
    en: '⏳ Checking opening dates and review counts against Google…',
    fr: '⏳ Vérification des dates d’ouverture et du nombre d’avis sur Google…',
    id: '⏳ Mencocokkan tanggal buka dan jumlah ulasan dengan Google…',
    ru: '⏳ Сверяю даты открытия и количество отзывов с Google…',
    de: '⏳ Gleiche Eröffnungsdaten und Bewertungszahlen mit Google ab…',
    zh: '⏳ 正在与 Google 核对开业日期和评价数量…',
    ja: '⏳ 開店日とレビュー数を Google と照合中…',
    es: '⏳ Comprobando fechas de apertura y número de reseñas en Google…'
  },
  'hidden.progress.4':            {
    en: '⏳ Almost there — drafting the picks.',
    fr: '⏳ Presque fini — rédaction des choix.',
    id: '⏳ Hampir selesai — sedang menyusun pilihannya.',
    ru: '⏳ Почти готово — составляю подборку.',
    de: '⏳ Fast fertig — die Auswahl wird zusammengestellt.',
    zh: '⏳ 快好了 — 正在整理推荐。',
    ja: '⏳ もう少しです — おすすめをまとめています。',
    es: '⏳ Casi listo — preparando las recomendaciones.'
  },
  'hidden.progress.5':            {
    en: '⏳ Hang tight — Gemini is being thorough so the picks aren\'t fluff.',
    fr: '⏳ Patientez — Gemini fait ça soigneusement pour éviter les choix bidons.',
    id: '⏳ Sabar sebentar — Gemini sedang teliti agar pilihannya bukan asal-asalan.',
    ru: '⏳ Немного терпения — Gemini работает тщательно, чтобы подборка не была пустой.',
    de: '⏳ Einen Moment — Gemini arbeitet gründlich, damit die Auswahl kein Füllmaterial ist.',
    zh: '⏳ 请稍候 — Gemini 正在仔细筛选，避免敷衍的推荐。',
    ja: '⏳ もう少しお待ちください — Gemini が丁寧に選んでいるので、中身のない推薦にはなりません。',
    es: '⏳ Un momento — Gemini está siendo minucioso para que las recomendaciones no sean relleno.'
  },
  'hidden.timeout':               {
    en: '⏱ /hidden timed out after 4 minutes — Gemini was unresponsive on every fallback model.\n\nThis usually clears in a few minutes. Try again, or check Google AI Studio status if it persists.',
    fr: '⏱ /hidden a dépassé le délai de 4 minutes — Gemini n’a pas répondu sur aucun modèle de repli.\n\nCela se résout en général en quelques minutes. Réessayez, ou vérifiez l’état de Google AI Studio si le problème persiste.',
    id: '⏱ /hidden habis waktu setelah 4 menit — Gemini tidak merespons di semua model cadangan.\n\nBiasanya pulih dalam beberapa menit. Coba lagi, atau periksa status Google AI Studio jika terus terjadi.',
    ru: '⏱ /hidden прервался по тайм-ауту через 4 минуты — Gemini не ответил ни на одной запасной модели.\n\nОбычно это проходит за несколько минут. Попробуйте снова или проверьте статус Google AI Studio, если повторяется.',
    de: '⏱ /hidden ist nach 4 Minuten abgelaufen — Gemini hat auf keinem Ersatzmodell geantwortet.\n\nDas löst sich meist in wenigen Minuten. Versuche es erneut oder prüfe den Status von Google AI Studio, wenn es anhält.',
    zh: '⏱ /hidden 在 4 分钟后超时 — 所有备用模型上 Gemini 均无响应。\n\n通常几分钟后就会恢复。请重试，若持续出现请查看 Google AI Studio 状态。',
    ja: '⏱ /hidden は 4 分でタイムアウトしました — すべてのフォールバックモデルで Gemini が無応答でした。\n\n通常は数分で解消します。再試行するか、続く場合は Google AI Studio のステータスをご確認ください。',
    es: '⏱ /hidden ha expirado tras 4 minutos — Gemini no respondió en ningún modelo de reserva.\n\nSuele resolverse en unos minutos. Inténtalo de nuevo o revisa el estado de Google AI Studio si persiste.'
  },
  'hidden.overload':              {
    en: '⚠️ Gemini is currently overloaded (503 high demand on every fallback model).\n\nTry /hidden again in a minute or two — your location is still cached so retry will be fast.',
    fr: '⚠️ Gemini est actuellement saturé (erreur 503 « high demand » sur tous les modèles de repli).\n\nRéessayez /hidden dans une minute ou deux — votre position est en cache, le réessai sera rapide.',
    id: '⚠️ Gemini sedang kelebihan beban (503 permintaan tinggi di semua model cadangan).\n\nCoba /hidden lagi satu dua menit — lokasi Anda masih tersimpan, jadi percobaan ulang akan cepat.',
    ru: '⚠️ Gemini сейчас перегружен (503, высокий спрос на всех запасных моделях).\n\nПопробуйте /hidden через минуту-две — ваше местоположение в кэше, повтор будет быстрым.',
    de: '⚠️ Gemini ist derzeit überlastet (503, hohe Nachfrage auf allen Ersatzmodellen).\n\nVersuchen Sie /hidden in ein bis zwei Minuten erneut — Ihr Standort ist noch zwischengespeichert, der Neuversuch geht schnell.',
    zh: '⚠️ Gemini 当前过载（所有备用模型均返回 503 高需求）。\n\n请一两分钟后重试 /hidden — 您的位置仍在缓存中，重试会很快。',
    ja: '⚠️ Gemini は現在混雑しています（すべてのフォールバックモデルで 503 の高負荷）。\n\n1〜2 分後にもう一度 /hidden をお試しください — 位置情報はキャッシュ済みなので再試行は高速です。',
    es: '⚠️ Gemini está saturado ahora mismo (error 503 por alta demanda en todos los modelos de reserva).\n\nVuelve a probar /hidden en un minuto o dos — tu ubicación sigue en caché, así que el reintento será rápido.'
  },
  'hidden.outerError':            {
    en: 'Sorry, /hidden hit an unexpected error. The team\'s been notified — please retry shortly.',
    fr: 'Désolé, /hidden a rencontré une erreur inattendue. L’équipe a été notifiée — veuillez réessayer bientôt.',
    id: 'Maaf, /hidden mengalami kesalahan tak terduga. Tim sudah diberi tahu — silakan coba lagi sebentar lagi.',
    ru: 'Извините, в /hidden произошла непредвиденная ошибка. Команда уведомлена — повторите попытку чуть позже.',
    de: 'Entschuldigung, /hidden ist auf einen unerwarteten Fehler gestoßen. Das Team ist informiert — bitte versuche es gleich noch einmal.',
    zh: '抱歉，/hidden 遇到意外错误。团队已收到通知 — 请稍后重试。',
    ja: '申し訳ありません、/hidden で予期しないエラーが発生しました。チームに通知済みです — 少し後にもう一度お試しください。',
    es: 'Lo sentimos, /hidden ha dado un error inesperado. El equipo ha sido avisado — inténtalo de nuevo en breve.'
  },
  'hidden.allClosed':             {
    en: 'All picks Gemini found turned out to be temporarily or permanently closed. Try again in a minute — Gemini may surface different gems on retry.',
    fr: 'Toutes les trouvailles proposées par Gemini se sont révélées temporairement ou définitivement fermées. Réessayez dans une minute — Gemini peut proposer d’autres trésors.',
    id: 'Semua pilihan yang ditemukan Gemini ternyata tutup sementara atau permanen. Coba lagi sebentar lagi — Gemini mungkin memunculkan permata lain.',
    ru: 'Все найденные Gemini места оказались временно или окончательно закрыты. Попробуйте через минуту — Gemini может предложить другие жемчужины.',
    de: 'Alle von Gemini gefundenen Tipps waren vorübergehend oder dauerhaft geschlossen. Versuche es in einer Minute erneut — Gemini findet beim nächsten Mal vielleicht andere Juwelen.',
    zh: 'Gemini 找到的推荐都已暂时或永久停业。请一分钟后重试 — Gemini 可能会给出别的宝藏。',
    ja: 'Gemini が見つけた候補はすべて一時休業または閉店でした。1 分ほど後にもう一度お試しください — 別の名店が出てくるかもしれません。',
    es: 'Todas las recomendaciones que encontró Gemini resultaron estar cerradas temporal o definitivamente. Inténtalo en un minuto — Gemini puede sacar otras joyas.'
  },
  // v0.61.319 — "Latest review" card line on /hidden rich venue cards.
  'hidden.latestReviewLabel':     {
    en: '📝 Latest review ·',
    fr: '📝 Dernier avis ·',
    id: '📝 Ulasan terbaru ·',
    ru: '📝 Последний отзыв ·',
    de: '📝 Neueste Bewertung ·',
    zh: '📝 最新评价 ·',
    ja: '📝 最新のレビュー ·',
    es: '📝 Última reseña ·'
  },

  // v0.59.4 — single-pick result-card "Nearby carparks" map button.
  'card.carparkMapBtn':           { en: '🅿️ Nearby carparks on map', fr: '🅿️ Parkings proches sur la carte' ,
                         id: '🅿️ Lokasi parkir terdekat di peta',
                         ru: '🅿️ Ближайшие парковки на карте',
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
    ].join('\n'),
    id: [
      '🔒 *Privasi & Data*',
      '',
      'Soleat hanya menyimpan apa yang diperlukan untuk menjalankan bot.',
      '',
      'Lokasi Anda dapat diingat hingga 24 jam untuk membantu menampilkan hasil di sekitar. Papan klip sederhana dapat menyimpan tempat dan lokasi yang telah Anda simpan, seperti jurnal atau album kecil perjalanan kuliner.',
      '',
      'Tidak ada profil pribadi yang dibuat. Soleat tidak memakai pelacak, tidak menjual data, dan tidak membangun profil lintas-bot.',
      '',
      'Anda dapat menghapus data tersimpan kapan saja dengan mengetik /forgetme.'
    ].join('\n'),
    ru: [
      '🔒 *Конфиденциальность и данные*',
      '',
      'Soleat хранит только то, что нужно для работы бота.',
      '',
      'Ваше местоположение может сохраняться до 24 часов, чтобы помогать с результатами поблизости. Простой буфер может хранить места и локации, которые вы сохранили, — как небольшой дневник или альбом гастрономических поездок.',
      '',
      'Личный профиль не создаётся. Soleat не использует трекеры, не продаёт данные и не строит профили между ботами.',
      '',
      'Вы можете удалить сохранённые данные в любой момент, введя /forgetme.'
    ].join('\n'),
    de: [
      '🔒 *Datenschutz & Daten*',
      '',
      'Soleat speichert nur, was für den Betrieb des Bots nötig ist.',
      '',
      'Ihr Standort kann bis zu 24 Stunden gemerkt werden, um Ergebnisse in der Nähe zu verbessern. Eine einfache Zwischenablage kann die von Ihnen gespeicherten Orte und Standorte halten — wie ein kleines Tagebuch oder Album kulinarischer Reisen.',
      '',
      'Es wird kein persönliches Profil angelegt. Soleat nutzt keine Tracker, verkauft keine Daten und erstellt keine bot-übergreifenden Profile.',
      '',
      'Sie können Ihre gespeicherten Daten jederzeit löschen, indem Sie /forgetme eingeben.'
    ].join('\n'),
    zh: [
      '🔒 *隐私与数据*',
      '',
      'Soleat 只保留运行机器人所必需的内容。',
      '',
      '您的位置最多可保留 24 小时，用于提供附近的结果。一个简单的剪贴板可以保存您收藏的地点和位置，就像一本小小的美食旅行日志或剪贴簿。',
      '',
      '不会创建个人画像。Soleat 不使用追踪器，不出售数据，也不构建跨机器人的用户画像。',
      '',
      '您随时可以输入 /forgetme 清除已保存的数据。'
    ].join('\n'),
    ja: [
      '🔒 *プライバシーとデータ*',
      '',
      'Soleat はボットの動作に必要なものだけを保持します。',
      '',
      '現在地は、近くの検索結果のために最大 24 時間記憶されることがあります。シンプルなクリップボードが、保存した場所や位置情報を、小さな食べ歩きの日記やスクラップブックのように保管できます。',
      '',
      '個人プロファイルは作成されません。Soleat はトラッカーを使用せず、データを販売せず、ボット横断のプロファイルも作成しません。',
      '',
      '保存されたデータは、/forgetme と入力すればいつでも消去できます。'
    ].join('\n'),
    es: [
      '🔒 *Privacidad y datos*',
      '',
      'Soleat solo conserva lo necesario para que el bot funcione.',
      '',
      'Tu ubicación puede recordarse hasta 24 horas para ayudar con los resultados cercanos. Un portapapeles sencillo puede guardar los lugares y ubicaciones que hayas guardado, como un pequeño diario o álbum de viajes gastronómicos.',
      '',
      'No se crea ningún perfil personal. Soleat no usa rastreadores, no vende datos ni construye perfiles entre bots.',
      '',
      'Puedes borrar tus datos guardados en cualquier momento escribiendo /forgetme.'
    ].join('\n')
  },
  'privacy.error':                {
    en: 'Sorry, /privacy hit an error. Please try again in a moment.',
    fr: 'Désolé, /privacy a rencontré une erreur. Veuillez réessayer dans un instant.',
    id: 'Maaf, /privacy mengalami kesalahan. Silakan coba lagi sebentar lagi.',
    ru: 'Извините, в /privacy произошла ошибка. Пожалуйста, попробуйте ещё раз через минуту.',
    de: 'Entschuldigung, beim Aufruf /privacy ist ein Fehler aufgetreten. Bitte versuchen Sie es in Kürze erneut.',
    zh: '抱歉，/privacy 出错了。请稍后再试。',
    ja: '申し訳ありません、/privacy でエラーが発生しました。しばらくしてからもう一度お試しください。',
    es: 'Lo sentimos, se ha producido un error en /privacy. Inténtalo de nuevo en un momento.'
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
    ].join('\n'),
    id: [
      '🔖 *Hukum & Penafian*',
      '',
      'Soleat disediakan "apa adanya" untuk kemudahan umum dan penjelajahan kuliner. Layanan ini dapat menggunakan AI, alat otomatis, Google Places, data publik Singapura, dan sumber langsung lainnya.',
      '',
      'Informasi dapat tidak akurat, tertunda, tidak lengkap, atau usang. Harap verifikasi langsung ke tempat usaha, terutama untuk 🟢 jam buka, 🕌 status halal, 🥗 pilihan vegetarian, 🐾 akses hewan peliharaan, 🏠 usaha rumahan, jadwal transportasi, dan perjalanan ke Malaysia.',
      '',
      'Soleat terutama mencakup Singapura. Jika Johor Bahru dipilih, hasilnya dapat mencakup Johor, Malaysia, dengan kualitas data terutama bergantung pada informasi Google Places yang tersedia.',
      '',
      'Soleat bukan nasihat profesional. Anda bertanggung jawab atas cara Anda menggunakan hasilnya. Pembuat tidak bertanggung jawab atas kerugian, klaim, gangguan, atau ketergantungan yang timbul dari penggunaan, sejauh diizinkan oleh hukum Singapura.',
      '',
      'Pembuat tidak bermaksud melanggar hak siapa pun. Untuk keberatan atau permintaan penghapusan, silakan hubungi [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'Untuk penanganan data, lihat /privacy.',
      '',
      '2026'
    ].join('\n'),
    ru: [
      '🔖 *Правовая информация и отказ от ответственности*',
      '',
      'Soleat предоставляется «как есть» для общего удобства и поиска еды. Сервис может использовать ИИ, автоматизированные инструменты, Google Places, открытые данные Сингапура и другие живые источники.',
      '',
      'Информация может быть неточной, запоздалой, неполной или устаревшей. Пожалуйста, уточняйте напрямую у заведений, особенно 🟢 часы работы, 🕌 статус халяль, 🥗 вегетарианские варианты, 🐾 допуск с животными, 🏠 домашние заведения, расписание транспорта и поездки в Малайзию.',
      '',
      'Soleat охватывает в основном Сингапур. Если выбран Джохор-Бару, результаты могут включать штат Джохор, Малайзия, при этом качество данных зависит главным образом от доступной информации Google Places.',
      '',
      'Soleat не является профессиональной консультацией. Вы несёте ответственность за то, как используете результаты. Создатель не несёт ответственности за убытки, претензии, перебои или доверие к результатам, возникшие вследствие использования, в максимальной степени, допускаемой правом Сингапура.',
      '',
      'Создатель не намерен нарушать чьи-либо права. По вопросам или запросам на удаление, пожалуйста, обращайтесь: [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'Об обработке данных см. /privacy.',
      '',
      '2026'
    ].join('\n'),
    de: [
      '🔖 *Rechtliches & Haftungsausschluss*',
      '',
      'Soleat wird „wie besehen“ zur allgemeinen Bequemlichkeit und zum Entdecken von Essen bereitgestellt. Es kann KI, automatisierte Werkzeuge, Google Places, öffentliche Daten Singapurs und weitere Live-Quellen nutzen.',
      '',
      'Informationen können ungenau, verzögert, unvollständig oder veraltet sein. Bitte prüfen Sie direkt beim Lokal nach, insbesondere 🟢 Öffnungszeiten, 🕌 Halal-Status, 🥗 vegetarische Optionen, 🐾 Zutritt mit Tieren, 🏠 Angebote aus Privatküchen, Fahrpläne und Reisen nach Malaysia.',
      '',
      'Soleat deckt hauptsächlich Singapur ab. Wenn Johor Bahru gewählt ist, können die Ergebnisse Johor, Malaysia, umfassen; die Datenqualität hängt dabei vor allem von den verfügbaren Google-Places-Informationen ab.',
      '',
      'Soleat ist keine professionelle Beratung. Sie sind dafür verantwortlich, wie Sie die Ergebnisse nutzen. Der Ersteller haftet nicht für Verluste, Ansprüche, Unterbrechungen oder Vertrauen, die aus der Nutzung entstehen, soweit dies nach singapurischem Recht zulässig ist.',
      '',
      'Der Ersteller beabsichtigt keine Rechtsverletzung. Für Anliegen oder Löschanfragen wenden Sie sich bitte an [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'Zum Umgang mit Daten siehe /privacy.',
      '',
      '2026'
    ].join('\n'),
    zh: [
      '🔖 *法律与免责声明*',
      '',
      'Soleat 按“现状”提供，仅供一般便利和美食发现之用。它可能使用 AI、自动化工具、Google Places、新加坡公开数据及其他实时来源。',
      '',
      '信息可能不准确、延迟、不完整或过时。请直接向店家核实，尤其是 🟢 营业时间、🕌 清真认证、🥗 素食选择、🐾 宠物入内、🏠 家庭厨房、交通时刻，以及前往马来西亚的行程。',
      '',
      'Soleat 主要覆盖新加坡。若选择新山，结果可能包含马来西亚柔佛州，数据质量主要取决于 Google Places 上可获得的信息。',
      '',
      'Soleat 不构成专业建议。您需自行负责如何使用这些结果。在新加坡法律允许的最大范围内，制作者不对因使用而产生的损失、索赔、中断或信赖承担责任。',
      '',
      '制作者无意侵犯任何权利。如有疑虑或需要下架，请联系 [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      '有关数据处理，请见 /privacy。',
      '',
      '2026'
    ].join('\n'),
    ja: [
      '🔖 *法的事項と免責事項*',
      '',
      'Soleat は、一般的な利便性と食の発見のために「現状有姿」で提供されます。AI、自動化ツール、Google Places、シンガポールの公開データ、その他のライブ情報源を利用する場合があります。',
      '',
      '情報は不正確、遅延、不完全、または古い可能性があります。特に 🟢 営業時間、🕌 ハラール対応、🥗 ベジタリアン対応、🐾 ペット同伴の可否、🏠 自宅営業の掲載、交通の時刻、マレーシアへの移動については、店舗に直接ご確認ください。',
      '',
      'Soleat は主にシンガポールを対象としています。ジョホールバルを選択した場合、結果にマレーシア・ジョホール州が含まれることがあり、データの品質は主に Google Places で入手できる情報に依存します。',
      '',
      'Soleat は専門的な助言ではありません。結果の利用方法についてはご自身の責任となります。制作者は、シンガポール法が認める最大限の範囲において、利用から生じる損失、請求、中断、または信頼に対して責任を負いません。',
      '',
      '制作者はいかなる権利も侵害する意図はありません。ご懸念や削除のご依頼は [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian) までご連絡ください。',
      '',
      'データの取り扱いについては /privacy をご覧ください。',
      '',
      '2026'
    ].join('\n'),
    es: [
      '🔖 *Aviso legal y exención de responsabilidad*',
      '',
      'Soleat se ofrece "tal cual" para comodidad general y descubrimiento gastronómico. Puede utilizar IA, herramientas automatizadas, Google Places, datos públicos de Singapur y otras fuentes en directo.',
      '',
      'La información puede ser inexacta, tardía, incompleta o estar desactualizada. Verifica directamente con los establecimientos, especialmente 🟢 el horario, 🕌 la certificación halal, 🥗 las opciones vegetarianas, 🐾 el acceso con mascotas, 🏠 los negocios caseros, los horarios de transporte y los viajes a Malasia.',
      '',
      'Soleat cubre principalmente Singapur. Si se selecciona Johor Bahru, los resultados pueden incluir Johor, Malasia, y la calidad de los datos dependerá sobre todo de la información disponible en Google Places.',
      '',
      'Soleat no constituye asesoramiento profesional. Eres responsable del uso que hagas de los resultados. El creador no se hace responsable de pérdidas, reclamaciones, interrupciones ni de la confianza depositada que se deriven del uso, en la máxima medida permitida por la legislación de Singapur.',
      '',
      'El creador no pretende infringir ningún derecho. Para consultas o solicitudes de retirada, contacta con [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian)',
      '',
      'Sobre el tratamiento de datos, consulta /privacy.',
      '',
      '2026'
    ].join('\n')
  },
  'legal.error':                  {
    en: 'Sorry, /legal hit an error. Try again in a moment.',
    fr: 'Désolé, /legal a rencontré une erreur. Veuillez réessayer dans un instant.',
    id: 'Maaf, /legal mengalami kesalahan. Coba lagi sebentar lagi.',
    ru: 'Извините, в /legal произошла ошибка. Попробуйте еще раз через минуту.',
    de: 'Entschuldigung, /legal ist auf einen Fehler gestoßen. Bitte versuchen Sie es in Kürze erneut.',
    zh: '抱歉，/legal 出错了。请稍后再试。',
    ja: '申し訳ありません、/legal でエラーが発生しました。しばらくしてからもう一度お試しください。',
    es: 'Lo sentimos, /legal ha dado un error. Inténtalo de nuevo en un momento.'
  },

  // v0.59.13 — /recognised localisation
  'recognised.heading':           { en: '🏆 *Singapore — recognised dining*', fr: '🏆 *Singapour — restaurants reconnus*' ,
                         id: '🏆 *Singapura — restoran ternama*',
                         ru: '🏆 *Сингапур — признанные рестораны*',
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
                         ja: '🍜 ミシュラン・ビブグルマン',
                         es: '🍜 MICHELIN Bib Gourmand'
                       },
  'recognised.btn.star':          { en: '⭐ MICHELIN Star', fr: '⭐ MICHELIN Étoile' ,
                          id: '⭐ Bintang MICHELIN',
                          ru: '⭐ Звезда Мишлен',
                          de: '⭐ MICHELIN Stern',
                          zh: '⭐米其林星级',
                          ja: '⭐ ミシュラン星付き',
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
                  ru: 'Пока нет недавних подборок. Сначала запустите /cuisine или /hidden, затем /share, чтобы переслать другу.',
                  de: 'Noch keine aktuellen Empfehlungen. Nutze zuerst /cuisine oder /hidden, dann /share, um eine Empfehlung an einen Freund weiterzuleiten.',
                  es: 'Aún no hay selecciones recientes. Ejecuta primero /cuisine o /hidden, luego /share para reenviarlo a un amigo.'
                ,
                  zh: '目前还没有精选内容。先运行 /cuisine 或 /hidden，再运行 /share 转发给朋友。',
                  ja: '最近のおすすめはまだありません。まず /cuisine または /hidden を実行し、次に /share を実行して友達に転送してください。'
                },
  'share.prompt':                 { en: 'Pick a venue to forward to your friend ({n} recent):',
                                    fr: 'Choisissez un lieu à partager avec votre ami ({n} récents) :' ,
                   id: 'Pilih tempat untuk diteruskan ke teman Anda ({n} baru-baru ini):',
                   ru: 'Выберите заведение, чтобы отправить его другу (последние {n}):',
                   de: 'Wählen Sie ein Lokal aus, das Sie an Ihren Freund weiterleiten möchten ({n} zuletzt):',
                   zh: '选择要转发给朋友的地点（最近 {n} 个）：',
                   ja: '友達に転送する場所を選択してください（最近の{n}件）：',
                   es: 'Elige un lugar para reenviar a tu amigo ({n} recientes):'
                 },
  'share.mintFailed':             { en: "Sorry, I couldn't mint share links right now.",
                                    fr: 'Désolé, impossible de générer les liens de partage pour le moment.' ,
                       id: 'Maaf, saya tidak bisa membuat tautan berbagi saat ini.',
                       ru: 'Извините, сейчас не удалось создать ссылки для отправки.',
                       de: 'Tut mir leid, ich konnte im Moment keine Links zum Teilen erstellen.',
                       zh: '抱歉，我现在无法生成分享链接。',
                       ja: '申し訳ありませんが、現在、共有リンクを作成できません。',
                       es: 'Lo siento, no puedo generar enlaces para compartir en este momento.'
                     },
  'share.error':                  { en: 'Sorry, /share hit an error.',
                                    fr: 'Désolé, /share a rencontré une erreur.' ,
                  id: 'Maaf, /share mengalami kesalahan.',
                  ru: 'Извините, при выполнении /share возникла ошибка.',
                  de: 'Entschuldigung, /share ist auf einen Fehler gestoßen.',
                  es: 'Lo sentimos, /share ha dado un error.'
                ,
                  zh: '抱歉，/share 发生错误。',
                  ja: '申し訳ありません、/share エラーが発生しました。'
                },

  // v0.59.13 — /buddy localisation
  'buddy.on.body':                { en: '👥 *Buddy mode ON.*\n\nWhen you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. Both of you must confirm before first names + Telegram handles are revealed. Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.\n\n⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._',
                                    fr: '👥 *Mode buddy ACTIVÉ.*\n\nLorsque vous recevez des sélections sanctuaires, un bouton 👥 _Connecter_ apparaît à côté des lieux où un autre utilisateur soleat opté-in se rend dans les 60 prochaines minutes. Vous devez tous deux confirmer avant que les prénoms et identifiants Telegram soient révélés. Limite quotidienne : 5 connexions / 24 h. `/buddy block <chat_id>` pour bloquer. `/buddy report <chat_id> <raison>` pour signaler. `/buddy off` pour désactiver.\n\n⚠ _Pilote — rencontrez uniquement en public, traitez comme un inconnu, faites confiance à votre instinct._' ,
                    id: '👥 *Mode Teman AKTIF.*\n\nSaat Anda menerima pilihan Sanctuary, tombol 👥 _Hubungkan_ akan muncul di sebelah tempat-tempat yang juga akan dikunjungi oleh pengguna soleat lain yang telah mendaftar dalam 60 menit berikutnya. Anda berdua harus mengkonfirmasi sebelum nama depan + nama pengguna Telegram ditampilkan. Batas harian: 5 koneksi / 24 jam. `/buddy block <chat_id>` untuk memblokir. `/buddy report <chat_id> <reason>` untuk melaporkan. `/buddy off` untuk menonaktifkan.\n\n⚠ _Pilot — temui hanya di tempat umum, perlakukan seperti orang asing, percayai insting Anda._',
                    ru: '👥 *Режим «Друг» включён.*\n\nКогда вы получаете предложения от Sanctuary, рядом с местами, куда в ближайшие 60 минут направляется другой пользователь Soleat, также включивший этот режим, появляется кнопка 👥 _Подключиться_. Оба должны подтвердить, прежде чем будут показаны имена и ники в Telegram. Дневной лимит: 5 подключений / 24 часа. `/buddy block <chat_id>` для блокировки. `/buddy report <chat_id> <reason>` для жалобы. `/buddy off` для отключения.\n\n⚠ _Пилот — встречайтесь только в общественных местах, относитесь к человеку как к незнакомцу, доверяйте своей интуиции._',
                    de: '👥 *Buddy-Modus EIN.*\n\nWenn Sie Sanctuary-Tipps erhalten, erscheint neben Orten, die ein anderer Soleat-Nutzer innerhalb der nächsten 60 Minuten besucht, ein 👥 „Verbinden“-Button. Sie müssen beide bestätigen, bevor Ihre Vornamen und Telegram-Namen angezeigt werden. Tägliches Limit: 5 Verbindungen / 24 Stunden. `/buddy block <chat_id>` zum Blockieren. `/buddy report <chat_id> <reason>` zum Melden. `/buddy off` zum Deaktivieren.\n\n⚠ _Pilot — treffen Sie sich nur an öffentlichen Orten, behandeln Sie die Person wie eine fremde Person, vertrauen Sie Ihrem Bauchgefühl._',
                    zh: '👥 *好友模式开启*\n\n当您收到 Sanctuary 推荐时，如果另一位已加入的 Soleat 用户也将在接下来的 60 分钟内前往某个地点，该地点旁边会出现一个 👥 _连接_ 按钮。双方必须确认后，才能显示彼此的名字和 Telegram 用户名。每日上限：5 个连接/24 小时。`/buddy block <chat_id>` 屏蔽。`/buddy report <chat_id> <reason>` 举报。`/buddy off` 禁用。\n\n⚠ _试运行功能——只在公共场所见面，像对待陌生人一样对待对方，相信您的直觉。_',
                    ja: '👥 *バディモードON。*\n\nSanctuaryのおすすめを受け取ると、次の60分以内に別のオプトイン済みのSoleatユーザーが向かう予定の場所の横に👥 _接続_ボタンが表示されます。お互いに確認しないと、名前とTelegramのハンドル名が表示されません。1日あたりの上限: 5接続 / 24時間。`/buddy block <chat_id>` でブロック。`/buddy report <chat_id> <reason>` で報告。`/buddy off` で無効にします。\n\n⚠ _試験運用 ― 必ず公共の場所で会い、見知らぬ人のように扱い、自分の直感を信じること。_',
                    es: '👥 *Modo compañero activado.*\n\nCuando recibas recomendaciones de Sanctuary, aparecerá un botón 👥 _Conectar_ junto a los lugares a los que otro usuario de soleat que haya optado por participar también se dirigirá en los próximos 60 minutos. Los dos tenéis que confirmar antes de que se muestren los nombres y los usuarios de Telegram. Límite diario: 5 conexiones / 24 h. `/buddy block <chat_id>` para bloquear. `/buddy report <chat_id> <reason>` para denunciar. `/buddy off` para desactivar.\n\n⚠ _Piloto: queda únicamente en lugares públicos, trata a la otra persona como a un desconocido, confía en tu instinto._'
                  },
  'buddy.off':                    { en: '👥 Buddy mode OFF.', fr: '👥 Mode buddy DÉSACTIVÉ.' ,
                id: '👥 Mode teman MATI.',
                ru: '👥 Режим «Друг» выключен.',
                de: '👥 Buddy-Modus AUS.',
                zh: '👥 好友模式已关闭。',
                ja: '👥 バディモードOFF。',
                es: '👥 Modo compañero DESACTIVADO.'
              },
  'buddy.block.usage':            { en: 'Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer.',
                                    fr: 'Usage : `/buddy block <chat_id>`. Récupérez l\'ID de chat depuis une offre de match précédente.' ,
                        id: 'Penggunaan: `/buddy block <chat_id>`. Dapatkan ID obrolan dari penawaran kecocokan sebelumnya.',
                        ru: 'Использование: `/buddy block <chat_id>`. Идентификатор чата возьмите из предыдущего предложения о встрече.',
                        de: 'Verwendung: `/buddy block <chat_id>`. Die Chat-ID stammt aus einem früheren Match-Angebot.',
                        zh: '用法：`/buddy block <chat_id>`。从之前的匹配邀请中获取聊天 ID。',
                        ja: '使用方法: `/buddy block <chat_id>`。以前のマッチングオファーからチャットIDを取得します。',
                        es: 'Uso: `/buddy block <chat_id>`. Obtén el ID de chat de una oferta de coincidencia anterior.'
                      },
  'buddy.block.ok':               { en: '🚫 Blocked {target}. They will never be matched with you.',
                                    fr: '🚫 {target} bloqué. Vous ne serez plus jamais associé.' ,
                     id: '🚫 {target} diblokir. Mereka tidak akan pernah dipasangkan dengan Anda.',
                     ru: '🚫 {target} заблокирован. Этот пользователь больше не будет вам предложен.',
                     de: '🚫 Blockiert {target}. Diese Person wird Ihnen niemals zugeordnet werden.',
                     zh: '🚫 已屏蔽{target}。他们永远不会与您匹配。',
                     ja: '🚫 {target}をブロックしました。今後、このユーザーとマッチングされることはありません。',
                     es: '🚫 {target} bloqueado. Nunca se le emparejará contigo.'
                   },
  'buddy.block.cap':              { en: 'Could not block (max 50 blocks reached).',
                                    fr: 'Impossible de bloquer (limite de 50 atteinte).' ,
                      id: 'Tidak dapat memblokir (maksimal 50 pemblokiran tercapai).',
                      ru: 'Не удалось заблокировать (достигнут максимум — 50 блокировок).',
                      de: 'Blockierung fehlgeschlagen (maximal 50 Blöcke erreicht).',
                      zh: '无法屏蔽（已达上限 50 个）。',
                      ja: 'ブロックできませんでした（最大ブロック数50に達しました）。',
                      es: 'No se pudo bloquear (se alcanzó el máximo de 50 bloqueos).'
                    },
  'buddy.report.usage':           { en: 'Usage: `/buddy report <chat_id> <reason>`.',
                                    fr: 'Usage : `/buddy report <chat_id> <raison>`.' ,
                         id: 'Penggunaan: `/buddy report <chat_id> <reason>`.',
                         ru: 'Использование: `/buddy report <chat_id> <reason>`.',
                         de: 'Verwendung: `/buddy report <chat_id> <reason>`.',
                         zh: '用法：`/buddy report <chat_id> <reason>`。',
                         ja: '使用方法: `/buddy report <chat_id> <reason>`。',
                         es: 'Uso: `/buddy report <chat_id> <reason>`.'
                       },
  'buddy.report.ok':              { en: "📝 Report logged. {target} is also auto-blocked from your matches. We'll review.",
                                    fr: '📝 Signalement enregistré. {target} est aussi auto-bloqué de vos matches. Nous examinerons.' ,
                      id: '📝 Laporan telah dicatat. {target} juga diblokir secara otomatis dari kecocokan Anda. Kami akan meninjaunya.',
                      ru: '📝 Жалоба зарегистрирована. {target} также автоматически исключён из ваших подборок. Мы всё проверим.',
                      de: '📝 Bericht protokolliert. {target} wurde automatisch für Ihre Matches blockiert. Wir prüfen den Vorgang.',
                      zh: '📝 已记录举报。{target}已被自动屏蔽，无法匹配。我们将进行审核。',
                      ja: '📝 報告が記録されました。{target}はマッチング対象から自動的にブロックされます。確認いたします。',
                      es: '📝 Denuncia registrada. {target} también ha sido bloqueado automáticamente de tus coincidencias. Lo revisaremos.'
                    },
  'buddy.status':                 { en: '👥 Buddy mode is currently *{state}*. Today\'s connections: {n}/{cap}. Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                                    fr: '👥 Le mode buddy est actuellement *{state}*. Connexions aujourd\'hui : {n}/{cap}. Utilisez `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <raison>`.' ,
                   id: '👥 Mode teman saat ini adalah *{state}*. Koneksi hari ini: {n}/{cap}. Gunakan `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   ru: '👥 Режим "Друг" в данный момент *{state}*. Количество подключений за сегодня: {n}/{cap}. Используйте `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   de: '👥 Der Buddy-Modus ist aktuell *{state}*. Heutige Verbindungen: {n}/{cap}. Verwenden Sie `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   zh: '👥 好友模式当前处于 *{state}* 状态。今日连接数：{n}/{cap}。使用`/buddy on`、`/buddy off`或`/buddy block <id>`，`/buddy report <id> <reason>`。',
                   es: '👥 El modo compañero está actualmente en *{state}*. Conexiones de hoy: {n}/{cap}. Usa `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.'
                 ,
                   ja: '👥 バディモードは現在 *{state}* です。今日の接続: {n}/{cap}。`/buddy on`、`/buddy off`、`/buddy block <id>`、`/buddy report <id> <reason>`を使用してください。'
                 },
  'buddy.status.on':              { en: 'ON', fr: 'ACTIVÉ' ,
                      id: 'AKTIF',
                      ru: 'ВКЛ',
                      de: 'AN',
                      zh: '开启',
                      ja: 'ON',
                      es: 'ACTIVADO'
                    },
  'buddy.status.off':             { en: 'OFF', fr: 'DÉSACTIVÉ' ,
                       id: 'MATI',
                       ru: 'ВЫКЛ',
                       de: 'AUS',
                       zh: '关闭',
                       ja: 'OFF',
                       es: 'DESACTIVADO'
                     },
  'buddy.error':                  { en: 'Sorry, /buddy hit an error.', fr: 'Désolé, /buddy a rencontré une erreur.' ,
                  id: 'Maaf, /buddy mengalami kesalahan.',
                  ru: 'Извините, /buddy выдал ошибку.',
                  de: 'Entschuldigung, /buddy ist auf einen Fehler gestoßen.',
                  es: 'Lo siento, /buddy ha dado un error.'
                ,
                  zh: '抱歉，/buddy 发生错误。',
                  ja: '申し訳ありません、/buddy エラーが発生しました。'
                },

  // v0.59.13 — "Open in Google Maps" buttons added to /carpark,
  // /transport train (nearest stations), /transport bus (nearest stops).
  // Caption + button label for the multi-stop Google Maps directions URL.
  'gmaps.openBtn':                { en: 'Google Map ↗', fr: 'Google Maps ↗' ,
                    id: 'Google Maps ↗',
                    ru: 'Google Maps ↗',
                    de: 'Google Maps ↗',
                    zh: '谷歌地图 ↗',
                    ja: 'Googleマップ ↗',
                    es: 'Google Maps ↗'
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
                             ru: 'Авария',
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
                                 es: 'Tráfico denso'
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
                                 ru: 'Прочее',
                                 de: 'Verschiedenes',
                                 zh: '其他事件',
                                 ja: 'その他',
                                 es: 'Varios'
                               },
  'incident.type.Diversion':           { en: 'Diversion', fr: 'Déviation' ,
                              id: 'Pengalihan',
                              ru: 'Объезд',
                              de: 'Umleitung',
                              zh: '改道',
                              ja: '迂回',
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
                             ja: '障害物',
                             es: 'Obstáculo'
                           },
  'incident.type.RoadBlock':           { en: 'Road Block', fr: 'Route bloquée' ,
                              id: 'Penghalang Jalan',
                              ru: 'Перекрытие дороги',
                              de: 'Straßensperre',
                              zh: '路障',
                              ja: '道路封鎖',
                              es: 'Bloqueo de carretera'
                            },
  'incident.type.MassDisruption':      { en: 'Mass Disruption', fr: 'Perturbation majeure' ,
                                   id: 'Gangguan Massal',
                                   ru: 'Массовый сбой',
                                   de: 'Großflächige Störung',
                                   zh: '大面积中断',
                                   ja: '大規模な混乱',
                                   es: 'Interrupción generalizada'
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
                             ja: '交通障害',
                             es: 'Incidente'
                           },

  // v0.59.17 — /cuisine chat-side strings (the chat reply that opens
  // the cuisine TMA, NOT the TMA itself which has its own i18n). Per
  // Human Lead 2026-05-06: with /language fr or French device locale,
  // the /cuisine chat message + buttons should be French.
  'cuisine.chat.title':           { en: '🍴 Cuisine Picker — Singapore to Johor Bahru',
                                    fr: '🍴 Sélecteur de cuisine — Singapour à Johor Bahru' ,
                         id: '🍴 Pemilih Kuliner — Singapura hingga Johor Bahru',
                         ru: '🍴 Выбор кухни — из Сингапура в Джохор-Бару',
                         de: '🍴 Kulinarische Auswahl – von Singapur nach Johor Bahru',
                         zh: '🍴 美食选择器 — 新加坡到新山',
                         ja: '🍴 料理選択ツール — シンガポールからジョホールバルへ',
                         es: '🍴 Selector de cocina: de Singapur a Johor Bahru'
                       },
  'cuisine.chat.anchored':        { en: '📍 Anchored to your last shared location.',
                                    fr: '📍 Ancré sur votre dernière position partagée.' ,
                            id: '📍 Ditambatkan ke lokasi terakhir yang Anda bagikan.',
                            ru: '📍 Привязано к последнему местоположению, которым вы поделились.',
                            de: '📍 An Ihrem zuletzt geteilten Standort verankert.',
                            zh: '📍 锚定于您上次共享的位置。',
                            ja: '📍 最後に共有した場所に固定されています。',
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
                                    ru: 'Для точного выбора сначала укажите своё местоположение.',
                                    de: 'Für passende Empfehlungen teilen Sie bitte zuerst Ihren Standort mit.',
                                    zh: '为了获得准确的推荐，请先分享您的位置。',
                                    ja: 'より正確な検索結果を得るには、まず現在地を共有してください。',
                                    es: 'Para obtener recomendaciones precisas, primero comparte tu ubicación.'
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
                           id: '🍴 Buka Pemilih Kuliner',
                           ru: '🍴 Открыть «Выбор кухни»',
                           de: '🍴 Küchenauswahl öffnen',
                           zh: '🍴 打开美食选择器',
                           ja: '🍴 料理選択ツールを開く',
                           es: '🍴 Abrir el selector de cocina'
                         },
  'cuisine.chat.shareLocBtn':     { en: '📍 Share location with bot', fr: '📍 Partager la position avec le bot' ,
                               id: '📍 Bagikan lokasi dengan bot',
                               ru: '📍 Поделиться местоположением с ботом',
                               de: '📍 Standort mit dem Bot teilen',
                               zh: '📍 与机器人分享位置',
                               ja: '📍 ボットと位置情報を共有',
                               es: '📍 Comparte tu ubicación con el bot'
                             },
  'cuisine.chat.openError':       { en: "Sorry, I can't open the Cuisine Picker right now.",
                                    fr: 'Désolé, impossible d’ouvrir le sélecteur de cuisine pour le moment.' ,
                             id: 'Maaf, saya tidak bisa membuka Pemilih Kuliner saat ini.',
                             ru: 'Извините, сейчас не удаётся открыть «Выбор кухни».',
                             de: 'Tut mir leid, ich kann den Küchenauswahl-Assistenten gerade nicht öffnen.',
                             zh: '抱歉，我现在无法打开美食选择器。',
                             ja: '申し訳ありませんが、現在、料理選択ツールを開くことができません。',
                             es: 'Lo siento, no puedo abrir el selector de cocina ahora mismo.'
                           },
  'cuisine.chat.webhookOnly':     { en: "The Cuisine Picker needs the webhook-mode TMA. Try /hidden for chat-based picks instead, or just type 'find me ramen' / similar and I'll search.",
                                    fr: 'Le Sélecteur de cuisine nécessite la TMA en mode webhook. Essayez /hidden pour des choix en chat, ou tapez « trouve-moi des ramen » / similaire et je cherche.' ,
                               id: 'Pemilih Kuliner membutuhkan TMA mode webhook. Coba /hidden untuk pilihan berbasis obrolan, atau ketik saja \'cari ramen untukku\' / serupa dan saya akan mencarinya.',
                               ru: 'Для «Выбора кухни» нужен TMA в режиме веб-хука. Попробуйте /hidden для выбора прямо в чате или просто напишите «find me ramen» или похожее, и я поищу.',
                               de: 'Der Cuisine Picker benötigt den TMA im Webhook-Modus. Verwenden Sie stattdessen /hidden für Chat-basierte Auswahlmöglichkeiten oder geben Sie einfach „find me ramen“ oder Ähnliches ein, und ich suche für Sie.',
                               zh: '美食选择器需要 webhook 模式的 TMA。如果想通过聊天进行选择，请尝试/hidden，或者直接输入“找拉面”/类似内容，我会帮你搜索。',
                               es: 'El selector de cocina necesita el TMA en modo webhook. Prueba con /hidden para selecciones basadas en chat, o simplemente escribe \'find me ramen\' o similar y lo buscaré.'
                             ,
                               ja: '料理選択ツールにはWebhookモードのTMAが必要です。チャットベースの選択には /hidden をお試しください。または、「ラーメンを探して」などと入力していただければ検索します。'
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
