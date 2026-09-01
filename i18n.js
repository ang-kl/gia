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

const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const STRINGS = {
  // Pick-list headers
  'pick.header.one':           { en: '📋 1 place', fr: '📋 1 lieu' ,
                      id: '📋 1 tempat',
                      ru: '📋 1 место',
                      de: '📋 1 Ort',
                      zh: '📋 1 个地点',
                      ja: '📋 1件',
                      es: '📋 1 lugar',
                      ko: '📋 1곳'
                    },
  'pick.header.many':          { en: '📋 {n} places', fr: '📋 {n} lieux' ,
                       id: '📋 {n} tempat',
                       ru: '📋 {n} мест',
                       de: '📋 {n} Orte',
                       zh: '📋 {n}个地方',
                       ja: '📋 {n}箇所',
                       es: '📋 {n} lugares',
                       ko: '📋 {n}곳'
                     },
  'pick.results.for':          { en: '🔎 Results for', fr: '🔎 Résultats pour' ,
                       id: '🔎 Hasil untuk',
                       ru: '🔎 Результаты для',
                       de: '🔎 Ergebnisse für',
                       zh: '🔎 搜索结果：',
                       ja: '🔎 検索結果：',
                       es: '🔎 Resultados para',
                       ko: '🔎 검색 결과'
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
                          es: '📍 Mapa no disponible para este conjunto.',
                          ko: '📍 이 목록은 지도를 사용할 수 없습니다.'
                        },

  // venue-templates.js — formatHoursLine
  'hours.openNow':             { en: 'Open now', fr: 'Ouvert maintenant' ,
                    id: 'Buka sekarang',
                    ru: 'Открыто сейчас',
                    de: 'Jetzt geöffnet',
                    zh: '现在营业',
                    ja: '営業中',
                    es: 'Abierto ahora',
                    ko: '영업 중'
                  },
  'hours.closed':              { en: 'Closed',   fr: 'Fermé' ,
                   id: 'Tutup',
                   ru: 'Закрыто',
                   de: 'Geschlossen',
                   zh: '已打烊',
                   ja: '閉店',
                   es: 'Cerrado',
                   ko: '영업 종료'
                 },

  // open-hours.js — closedTodayString
  'hours.closedToday':         { en: 'Closed today',     fr: 'Fermé aujourd’hui' ,
                        id: 'Tutup hari ini',
                        ru: 'Сегодня закрыто',
                        de: 'Heute geschlossen',
                        zh: '今天休息',
                        ja: '本日休業',
                        es: 'Cerrado hoy',
                        ko: '오늘 휴무'
                      },
  'hours.opensTomorrowAt':     { en: 'Opens tomorrow at {time}', fr: 'Ouvre demain à {time}' ,
                            id: 'Buka besok pukul {time}',
                            ru: 'Откроется завтра в {time}',
                            de: 'Öffnet morgen um {time}',
                            zh: '明天{time}开门',
                            ja: '明日{time}にオープンします',
                            es: 'Abre mañana a las {time}',
                            ko: '내일 {time}에 영업 시작'
                          },
  'hours.opensInDays':         { en: 'Opens in {n} days', fr: 'Ouvre dans {n} jours' ,
                        id: 'Buka dalam {n} hari',
                        ru: 'Открытие через {n} дней',
                        de: 'Öffnet in {n} Tagen',
                        zh: '将于{n}天后开业',
                        ja: '{n}日後にオープン',
                        es: 'Abre en {n} días',
                        ko: '{n}일 후 영업 시작'
                      },
  'hours.opensTodayAt':        { en: 'Opens today at {time}', fr: 'Ouvre aujourd’hui à {time}' ,
                         id: 'Buka hari ini pukul {time}',
                         ru: 'Откроется сегодня в {time}',
                         de: 'Öffnet heute um {time}',
                         zh: '今天{time}开门营业',
                         ja: '本日{time}にオープンします。',
                         es: 'Abre hoy a las {time}',
                         ko: '오늘 {time}에 영업 시작'
                       },

  // venue-templates.js — formatStatsLine crowd labels (carry parity with
  // ResultCard so the pasted message + on-screen card match)
  'crowd.high':                { en: '🔴 busy',     fr: '🔴 chargé' ,
                 id: '🔴 sibuk',
                 ru: '🔴 многолюдно',
                 de: '🔴 voll',
                 zh: '🔴 忙碌',
                 ja: '🔴 混雑',
                 es: '🔴 concurrido',
                 ko: '🔴 혼잡'
               },
  'crowd.medium':              { en: '🟡 moderate', fr: '🟡 modéré' ,
                   id: '🟡 sedang',
                   ru: '🟡 умеренно',
                   de: '🟡 mäßig',
                   zh: '🟡 适中',
                   ja: '🟡 やや混雑',
                   es: '🟡 moderado',
                   ko: '🟡 보통'
                 },
  'crowd.low':                 { en: '🟢 quiet',    fr: '🟢 calme' ,
                id: '🟢 tenang',
                ru: '🟢 спокойно',
                de: '🟢 ruhig',
                zh: '🟢安静',
                ja: '🟢 空いている',
                es: '🟢 tranquilo',
                ko: '🟢 한산'
              },

  // copy-syntax — wrapper line above the /cuisine command
  'syntax.wrapper':            { en: 'Re-run this search anytime by tapping or pasting:', fr: 'Relancez cette recherche à tout moment en touchant ou collant :' ,
                     id: 'Lakukan pencarian ulang kapan saja dengan mengetuk atau menempelkan:',
                     ru: 'Повторить поиск можно в любое время, просто нажав или вставив текст:',
                     de: 'Sie können diese Suche jederzeit durch Antippen oder Einfügen erneut ausführen:',
                     zh: '您可随时点击或粘贴以下命令重新运行此搜索：',
                     ja: 'タップまたは貼り付けることで、いつでもこの検索を再実行できます。',
                     es: 'Vuelve a ejecutar esta búsqueda en cualquier momento tocando o pegando:',
                     ko: '다음을 탭하거나 붙여넣으면 언제든 이 검색을 다시 실행할 수 있습니다:'
                   },

  // v0.59.0 — bot chrome (most-trafficked chat replies)
  'bot.busy':                  { en: '⏳ Soleat is still working on your last request — hold on a moment.',
                                 fr: '⏳ Soleat traite encore votre dernière demande — un instant.' ,
               id: '⏳ Soleat masih memproses permintaan terakhir Anda — mohon tunggu sebentar.',
               ru: '⏳ Soleat все еще обрабатывает ваш последний запрос — подождите немного.',
               de: '⏳ Soleat arbeitet noch an Ihrer letzten Anfrage – bitte haben Sie einen Moment Geduld.',
               zh: '⏳ Soleat 仍在处理您的最后一个请求——请稍等片刻。',
               ja: '⏳ Soleat は最後のリクエストの処理をまだ行っています。少々お待ちください。',
               es: '⏳ Soleat todavía está trabajando en tu última solicitud; espera un momento.',
               ko: '⏳ Soleat이 이전 요청을 아직 처리 중입니다 — 잠시만 기다려 주세요.'
             },
  'bot.location.prompt':       { en: '📍 Tap to share your current location.',
                                 fr: '📍 Touchez pour partager votre position actuelle.' ,
                          id: '📍 Ketuk untuk membagikan lokasi Anda saat ini.',
                          ru: '📍 Нажмите, чтобы поделиться своим текущим местоположением.',
                          de: '📍 Tippen Sie hier, um Ihren aktuellen Standort zu teilen.',
                          zh: '📍点击分享您的当前位置。',
                          ja: '📍 現在地を共有するにはタップしてください。',
                          es: '📍 Toca para compartir tu ubicación actual.',
                          ko: '📍 탭하여 현재 위치를 공유하세요.'
                        },
  'bot.location.locale':       {
    en: '📍 Share your location once so Soleat uses your locale (or type `/location <place name>` to set it manually).',
    fr: '📍 Partagez votre position une fois pour que Soleat utilise votre lieu (ou tapez `/location <nom du lieu>` pour le définir manuellement).',
    id: '📍 Bagikan lokasi Anda sekali agar Soleat memakai wilayah Anda (atau ketik `/location <place name>` untuk mengaturnya manual).',
    ru: '📍 Поделитесь местоположением один раз, чтобы Soleat использовал ваш регион (или введите `/location <place name>`, чтобы задать вручную).',
    de: '📍 Teilen Sie Ihren Standort einmalig, damit Soleat Ihre Regionseinstellung verwendet (oder geben Sie `/location <place name>` ein, um ihn manuell festzulegen).',
    zh: '📍 分享一次您的位置，以便 Soleat 使用您的语言环境（或输入 `/location <place name>` 手动设置）。',
    ja: '📍 一度位置情報を共有すると、Soleat があなたの地域設定を使用します (または、`/location <place name>` と入力して手動で設定します)。',
    es: '📍 Comparte tu ubicación una sola vez para que Soleat use tu configuración regional (o escribe `/location <place name>` para configurarla manualmente).',
    ko: '📍 위치를 한 번 공유하면 Soleat이 해당 지역 설정을 사용합니다 (또는 `/location <장소 이름>`을 입력해 직접 설정하세요).'
  },
  'bot.noresults':             { en: 'No Google Places results for "{q}" near you. Try /cuisine for the picker, /hidden for nearby gems, or rephrase your search.',
                                 fr: 'Aucun résultat Google Places pour "{q}" près de vous. Essayez /cuisine pour le sélecteur, /hidden pour les trouvailles, ou reformulez votre recherche.' ,
                    id: 'Tidak ada hasil Google Places untuk "{q}" di dekat Anda. Coba /cuisine untuk pemilih makanan, /hidden untuk tempat makan favorit di dekat Anda, atau ubah frasa pencarian Anda.',
                    ru: 'В Google Places нет результатов поиска по запросу "{q}" рядом с вами. Попробуйте использовать /cuisine для выбора заведения, /hidden для поиска интересных мест поблизости или измените формулировку запроса.',
                    de: 'Für "{q}" in Ihrer Nähe wurden keine Google Places-Ergebnisse gefunden. Versuchen Sie es mit /cuisine für die Restaurantauswahl, /hidden für weitere Restaurants in der Nähe oder formulieren Sie Ihre Suche um.',
                    es: 'No hay resultados de Google Places para "{q}" cerca de ti. Prueba con /cuisine para el selector, /hidden para joyas cercanas o reformula tu búsqueda.'
                  ,
                    zh: '您附近没有与“{q}”相关的 Google Places 结果。可以试试 /cuisine 使用菜系选择器，或 /hidden 查找附近的宝藏餐馆，或者换个说法再搜索。',
                    ja: '「{q}」で検索しても、お近くのGoogleプレイスの結果は見つかりませんでした。ピッカーで /cuisine、近くのおすすめスポットで /hidden を試すか、検索語句を変更してください。',
                    ko: '"{q}" 에 대한 근처 Google Places 결과가 없습니다. 선택기는 /cuisine, 근처 숨은 맛집은 /hidden을 사용해 보세요.'
                  },
  'bot.error.freetext':        {
    en: 'Sorry, free-text search hit an error. Try /cuisine or /hidden.',
    fr: 'Désolé, la recherche libre a rencontré une erreur. Essayez /cuisine ou /hidden.',
    id: 'Maaf, pencarian teks bebas mengalami kesalahan. Coba /cuisine atau /hidden.',
    ru: 'Извините, свободный поиск завершился ошибкой. Попробуйте /cuisine или /hidden.',
    de: 'Entschuldigung, die Freitextsuche ist auf einen Fehler gestoßen. Versuchen Sie /cuisine oder /hidden.',
    zh: '抱歉，自由文本搜索出错了。请试试 /cuisine 或 /hidden。',
    ja: '申し訳ありません、フリーテキスト検索でエラーが発生しました。/cuisine または /hidden をお試しください。',
    es: 'Lo sentimos, la búsqueda libre ha dado un error. Prueba con /cuisine o /hidden.',
    ko: '죄송합니다, 자유 검색 중 오류가 발생했습니다. /cuisine 또는 /hidden을 사용해 보세요.'
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
                       es: '⇩─ Restaurantes con platos o cocina similares ─ ⇩\n⇩─ no exactamente {dish} ─ ⇩',
                       ko: '⇩─ 비슷한 요리나 요리 종류를 파는 음식점 ─ ⇩\n⇩─ {dish} 그 자체는 아닙니다 ─ ⇩'
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
                        es: '⚠️ <i>Ningún restaurante de Singapur sirve claramente {dish}; estos coinciden con tus palabras de búsqueda:</i>',
                        ko: '⚠️ <i>{dish}을(를) 확실히 파는 싱가포르 음식점은 없습니다 — 아래는 검색어와 일치한 곳입니다:</i>'
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
                  es: 'ℹ️ <b>{name}</b> — {note}',
                  ko: 'ℹ️ <b>{name}</b> — {note}'
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
                            es: '🙂 <i>¿Quizás buscabas un método de cocción? Toca una cocina a continuación o busca literalmente.</i>',
                            ko: '🙂 <i>혹시 조리법을 찾으셨나요?</i> 아래 요리 종류를 탭하거나, 입력한 그대로 검색하세요.'
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
                                es: '🍛 Por favor, prueba con el nombre de un plato, un método de cocción o un término culinario, por ejemplo: Mee Soto, char kway teow o goulash dumpling.',
                                ko: '🍛 요리 이름, 조리법, 또는 음식 관련 단어를 입력해 주세요 - 예: Mee Soto, char kway teow. 또는 /cuisine으로 이동하세요.'
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
    es: '🚆 Para trenes, autobuses y moverte por Singapur, toca /transport. Este chat busca comida y locales.',
    ko: '🚆 기차, 버스 등 싱가포르 교통 정보는 /transport를 탭하세요. 이 채팅은 음식을 검색합니다.'
  },
  'cookmethod.literalBtn':     { en: '🔍 Search literally',
                                 fr: '🔍 Rechercher tel quel' ,
                            id: '🔍 Cari secara harfiah',
                            ru: '🔍 Искать буквально',
                            de: '🔍 Wörtlich suchen',
                            zh: '🔍 逐字搜索',
                            ja: '🔍 文字通り検索',
                            es: '🔍 Buscar literalmente',
                            ko: '🔍 입력한 그대로 검색'
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
                        es: '💡 ¿Quieres diferentes opciones para la misma búsqueda?',
                        ko: '💡 같은 검색으로 다른 결과를 보시겠어요?'
                      },
  'freetext.moreBtn':          { en: '🔍 Search for more',
                                 fr: '🔍 Voir d\'autres résultats' ,
                       id: '🔍 Cari selengkapnya',
                       ru: '🔍 Искать больше',
                       de: '🔍 Weitere Treffer suchen',
                       zh: '🔍 搜索更多',
                       ja: '🔍 さらに検索する',
                       es: '🔍 Buscar más',
                       ko: '🔍 더 검색하기'
                     },
  'freetext.recycleBtn':       { en: '↺ Start over',
                                 fr: '↺ Recommencer' ,
                          id: '↺ Mulai lagi',
                          ru: '↺ Начать заново',
                          de: '↺ Von vorne beginnen',
                          zh: '↺ 重新开始',
                          ja: '↺ 最初からやり直す',
                          es: '↺ Volver a empezar',
                          ko: '↺ 처음부터'
                        },
  'freetext.noMore':           { en: '🔚 No more matching results · Change criteria or tap ↺ to start over.',
                                 fr: '🔚 Plus de résultats correspondants · Modifiez les critères ou touchez ↺ pour recommencer.' ,
                      id: '🔚 Tidak ada lagi hasil yang cocok · Ubah kriteria atau ketuk ↺ untuk memulai dari awal.',
                      ru: '🔚 Результаты поиска больше не найдены · Измените критерии или нажмите ↺, чтобы начать заново.',
                      de: '🔚 Keine weiteren passenden Ergebnisse · Kriterien ändern oder tippen Sie auf ↺, um von vorn zu beginnen.',
                      zh: '🔚 没有更多匹配结果 · 更改条件或点击 ↺ 重新开始。',
                      ja: '🔚 一致する結果はありません · 条件を変更するか、↺ をタップして最初からやり直してください。',
                      es: '🔚 No hay más resultados coincidentes · Cambia los criterios o toca ↺ para empezar de nuevo.',
                      ko: '🔚 더 이상 일치하는 결과가 없습니다 · 조건을 바꾸거나 ↺ 를 탭해 다시 시작하세요.'
                    },
  'freetext.expired':          { en: '⌛ That search has expired. Please re-type your query.',
                                 fr: '⌛ Cette recherche a expiré. Veuillez ressaisir votre requête.' ,
                       id: '⌛ Pencarian tersebut telah kedaluwarsa. Silakan ketik ulang kueri Anda.',
                       ru: '⌛ Срок действия этого поиска истек. Пожалуйста, введите запрос заново.',
                       de: '⌛ Diese Suche ist abgelaufen. Bitte geben Sie Ihre Suchanfrage erneut ein.',
                       zh: '⌛ 该搜索已过期。请重新输入您的查询。',
                       ja: '⌛ その検索は期限切れです。もう一度検索語を入力してください。',
                       es: '⌛ Esa búsqueda ha caducado. Vuelve a escribir tu consulta.',
                       ko: '⌛ 해당 검색이 만료되었습니다. 검색어를 다시 입력해 주세요.'
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
                          es: '📍 Elige una ciudad a continuación o una ubicación guardada.',
                          ko: '📍 아래에서 도시를 고르거나 저장된 위치를 선택하세요'
                        },
  'loc.set.success':           { en: '📍 Location set to <b>{label}</b>.{cap}',
                                 fr: '📍 Position définie sur <b>{label}</b>.{cap}' ,
                      id: '📍 Lokasi diatur ke <b>{label}</b>.{cap}',
                      ru: '📍 Местоположение установлено на <b>{label}</b>.{cap}',
                      de: '📍 Standort eingestellt auf <b>{label}</b>.{cap}',
                      zh: '📍 位置已设置为 <b>{label}</b>。{cap}',
                      ja: '📍 場所を <b>{label}</b> に設定しました。{cap}',
                      es: '📍 Ubicación establecida en <b>{label}</b>.{cap}',
                      ko: '📍 위치가 <b>{label}</b>(으)로 설정되었습니다.{cap}'
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
                         es: '📍 Área configurada: {area}\n\nUsa <code>/location</code> o <code>/l &lt;place&gt;</code> · cambiar dirección',
                         ko: '📍 지역 설정: {area}\n\n<code>/location</code> 또는 <code>/l &lt;장소&gt;</code> 로 언제든 변경하세요'
                       },
  'loc.set.capNote':           { en: ' Searches anchored here are capped to {km} km.',
                                 fr: ' Les recherches sont limitées à {km} km autour de ce point.' ,
                      id: ' Pencarian yang berpusat di sini dibatasi hingga {km} km.',
                      ru: ' Поиск, привязанный к этому месту, ограничен диапазоном {km} км.',
                      de: ' Hier verankerte Suchanfragen sind auf {km} km begrenzt.',
                      zh: ' 此处的搜索范围上限为{km}公里。',
                      ja: ' ここを基準とした検索範囲は{km} kmに制限されます。',
                      es: ' Las búsquedas ancladas aquí están limitadas a {km} km.',
                      ko: ' 이곳을 기준으로 한 검색은 {km} km 이내로 제한됩니다.'
                    },
  'loc.set.unknown':           { en: "⚠️ I don't recognise that quick-pick. Tap one of the buttons or share a pin.",
                                 fr: "⚠️ Je ne reconnais pas cette sélection. Touchez l'un des boutons ou partagez une position." ,
                      id: '⚠️ Saya tidak mengenali pilihan cepat itu. Ketuk salah satu tombol atau bagikan lokasi.',
                      ru: '⚠️ Не удалось распознать этот быстрый выбор. Нажмите одну из кнопок или отправьте геометку.',
                      de: '⚠️ Diese Schnellauswahl ist mir unbekannt. Tippen Sie auf eine der Schaltflächen oder teilen Sie einen Standort.',
                      zh: '⚠️ 我不认识这个快捷选择。请点击其中一个按钮或分享位置。',
                      ja: '⚠️ このクイックピックは認識できません。いずれかのボタンをタップするか、ピンを共有してください。',
                      es: '⚠️ No reconozco esa selección rápida. Toca uno de los botones o comparte un pin.',
                      ko: '⚠️ 해당 빠른 선택을 인식하지 못했습니다. 버튼 중 하나를 탭하거나 위치를 공유해 주세요.'
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
                            es: '<i>¿Quieres ver restaurantes en <b>{place}</b>?</i>',
                            ko: '<i><b>{place}</b>의 음식점을 보시겠어요?</i>'
                          },
  'loc.searchPick.btn':        { en: '🔍 See eateries here',
                                 fr: '🔍 Voir les établissements ici' ,
                         id: '🔍 Lihat tempat makan di sini',
                         ru: '🔍 Показать заведения здесь',
                         de: '🔍 Lokale hier anzeigen',
                         zh: '🔍 点击此处查看餐厅',
                         ja: '🔍 飲食店一覧はこちら',
                         es: '🔍 Ver restaurantes aquí',
                         ko: '🔍 이곳의 음식점 보기'
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
                   es: '📍 <b>{place}</b> — se encontraron {n} restaurantes aquí',
                   ko: '📍 <b>{place}</b> — 이곳에서 음식점 {n}곳을 찾았습니다'
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
                              es: '📍 <b>{place}</b> — mostrando {shown} de {total} restaurantes aquí',
                              ko: '📍 <b>{place}</b> — 이곳의 음식점 {total}곳 중 {shown}곳 표시'
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
                            es: '_Escasas opciones en <b>{place}</b> — aquí están los restaurantes mejor valorados de la zona:_',
                            ko: '_<b>{place}</b>에는 선택지가 적습니다 — 근처에서 평점이 높은 음식점입니다:_'
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
                          es: '✨ <b>Los {n} mejores restaurantes fuera de {place}</b> (en un radio de {km} km, ordenados por puntuación · Michelin · rareza · afluencia)',
                          ko: '✨ <b>{place} 밖의 음식점 상위 {n}곳</b> ({km} km 이내, 평점 · 미쉐린 · 희소성 순)'
                        },
  'place.outsideEmpty':        { en: '🤷 No standout eateries outside {place} (within {km} km) right now.',
                                 fr: '🤷 Aucun établissement marquant hors de {place} (dans un rayon de {km} km) en ce moment.' ,
                         id: '🤷 Tidak ada tempat makan unggulan di luar {place} (dalam radius {km} km) saat ini.',
                         ru: '🤷 В настоящее время за пределами {place} (в пределах {km} км) нет выдающихся заведений общественного питания.',
                         de: '🤷 Derzeit gibt es außerhalb von {place} (im Umkreis von {km} km) keine herausragenden Restaurants.',
                         zh: '🤷 目前在 {place} 以外（{km} 公里范围内）没有特别出色的餐馆。',
                         ja: '🤷 現在、{place} 以外（{km} km 以内）には特におすすめの飲食店はありません。',
                         es: '🤷 No hay restaurantes destacados fuera de {place} (dentro de {km} km) en este momento.',
                         ko: '🤷 지금은 {place} 밖 {km} km 이내에 눈에 띄는 음식점이 없습니다.'
                       },
  'place.foundEmpty':          { en: "📍 <b>{place}</b> — couldn't find eateries here. Showing top-rated nearby instead.",
                                 fr: "📍 <b>{place}</b> — aucun établissement ici. Voici les mieux notés à proximité." ,
                       id: '📍 <b>{place}</b> — tidak ditemukan tempat makan di sini. Sebagai gantinya, menampilkan tempat makan dengan peringkat teratas di dekatnya.',
                       ru: '📍 <b>{place}</b> — не удалось найти здесь заведения общественного питания. Вместо этого отображаются лучшие заведения поблизости.',
                       de: '📍 <b>{place}</b> – Hier konnten keine Restaurants gefunden werden. Stattdessen werden die am besten bewerteten Restaurants in der Nähe angezeigt.',
                       zh: '📍 <b>{place}</b> — 此处未找到餐厅。显示附近评分最高的餐厅。',
                       ja: '📍 <b>{place}</b> — このエリアには飲食店が見つかりませんでした。代わりに、近隣の高評価の飲食店を表示します。',
                       es: '📍 <b>{place}</b> — No se encontraron restaurantes aquí. En su lugar, se muestran los mejor valorados en las cercanías.',
                       ko: '📍 <b>{place}</b> — 이곳에서 음식점을 찾지 못했습니다. 대신 근처의 평점 높은 곳을 표시합니다.'
                     },
  'place.nearbyBtn':           { en: '✨ Top eateries nearby',
                                 fr: '✨ Meilleurs établissements à proximité' ,
                      id: '✨ Tempat makan terbaik di sekitar sini',
                      ru: '✨ Лучшие рестораны поблизости',
                      de: '✨ Top-Restaurants in der Nähe',
                      zh: '✨附近热门餐厅',
                      ja: '✨ 近隣の人気飲食店',
                      es: '✨ Los mejores restaurantes cercanos',
                      ko: '✨ 근처 인기 음식점'
                    },
  'place.nearbyHeader':        { en: '✨ <b>Top {n} eateries near {place}</b> (within {km} km, ranked by rating · Michelin · rarity · crowd)',
                                 fr: '✨ <b>Top {n} établissements près de {place}</b> (dans un rayon de {km} km, classés par note · Michelin · rareté · affluence)' ,
                         id: '✨ <b>{n} tempat makan terbaik di dekat {place}</b> (dalam radius {km} km, diurutkan berdasarkan peringkat · Michelin · kelangkaan · keramaian)',
                         ru: '✨ <b>Топ-{n} заведений рядом с {place}</b> (в пределах {km} км, по рейтингу · Michelin · редкости · заполненности)',
                         de: '✨ <b>Top {n} Restaurants in der Nähe von {place}</b> (im Umkreis von {km} km, sortiert nach Bewertung · Michelin · Seltenheit · Publikumsandrang)',
                         zh: '✨ <b>{place} 附近的前 {n} 家餐馆</b>（{km} 公里内，按评分 · 米其林 · 稀有度 · 客流量排序）',
                         ja: '✨ <b>{place}周辺のおすすめ飲食店トップ{n}軒</b>（{km} km以内、評価・ミシュラン・希少性・混雑度順）',
                         es: '✨ <b>Los {n} mejores restaurantes cerca de {place}</b> (en un radio de {km} km, ordenados por puntuación · Michelin · rareza · afluencia)',
                         ko: '✨ <b>{place} 근처 음식점 상위 {n}곳</b> ({km} km 이내, 평점 · 미쉐린 · 희소성 순)'
                       },
  'place.nearbyEmpty':         { en: '🤷 No standout eateries within {km} km of {place} right now.',
                                 fr: '🤷 Aucun établissement marquant dans un rayon de {km} km de {place} en ce moment.' ,
                        id: '🤷 Tidak ada tempat makan unggulan dalam radius {km} km dari {place} saat ini.',
                        ru: '🤷 В радиусе {km} км от {place} в данный момент нет выдающихся заведений общественного питания.',
                        de: '🤷 Derzeit gibt es im Umkreis von {km} km um {place} keine herausragenden Restaurants.',
                        zh: '🤷 目前在{place}附近{km}公里范围内没有特别出色的餐馆。',
                        ja: '🤷 現在{place}から{km} km以内に特におすすめの飲食店はありません。',
                        es: '🤷 No hay restaurantes destacados en un radio de {km} km de {place} en este momento.',
                        ko: '🤷 지금은 {place}에서 {km} km 이내에 눈에 띄는 음식점이 없습니다.'
                      },
  'place.expired':             { en: '⏱ That suggestion expired. Type the place name again to refresh.',
                                 fr: '⏱ Cette suggestion a expiré. Tapez à nouveau le nom du lieu pour actualiser.' ,
                    id: '⏱ Saran tersebut telah kedaluwarsa. Ketik nama tempat lagi untuk memuat ulang.',
                    ru: '⏱ Это предложение устарело. Введите название места еще раз для обновления.',
                    de: '⏱ Dieser Vorschlag ist abgelaufen. Geben Sie den Ortsnamen erneut ein, um die Liste zu aktualisieren.',
                    zh: '⏱ 该建议已过期。请再次输入地名以刷新。',
                    ja: '⏱ その提案は期限切れです。もう一度地名を入力して更新してください。',
                    es: '⏱ Esa sugerencia ha caducado. Escribe de nuevo el nombre del lugar para actualizar.',
                    ko: '⏱ 해당 추천이 만료되었습니다. 장소 이름을 다시 입력해 새로고침하세요.'
                  },
  'bot.location.share':        { en: "📍 Tap to share your location, or type a place name. I'll search after.",
                                 fr: '📍 Touchez pour partager votre position, ou tapez un nom de lieu. Je chercherai ensuite.' ,
                         id: '📍 Ketuk untuk membagikan lokasi Anda, atau ketik nama tempat. Saya akan mencarinya nanti.',
                         ru: '📍 Нажмите, чтобы поделиться своим местоположением, или введите название места. Я выполню поиск позже.',
                         de: '📍 Tippen Sie, um Ihren Standort zu teilen, oder geben Sie einen Ortsnamen ein. Ich suche anschließend.',
                         zh: '📍 点击分享您的位置，或输入地点名称。我稍后会搜索。',
                         ja: '📍 タップして現在地を共有するか、場所の名前を入力してください。後で検索します。',
                         es: '📍 Toca para compartir tu ubicación o escribe el nombre de un lugar. Yo lo buscaré después.',
                         ko: '📍 탭하여 위치를 공유하거나 장소 이름을 입력하세요. 그 다음 검색해 드립니다.'
                       },
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
  // v0.62.883 (K6) — the ninth. Same shape as its eight siblings: the family is
  // keyed by the TARGET language and read as t(`bot.lang.set.${code}`, display), so
  // the value is written once IN Korean and carries no per-locale columns. A `ko`
  // column here would be unreachable — only display === 'ko' would read it, and
  // display always equals the code in the key.
  'bot.lang.set.ko':           { en: '✅ 언어가 한국어로 설정되었습니다 (미니 앱용).', fr: '✅ 언어가 한국어로 설정되었습니다 (미니 앱용).' },

  // v0.59.1 — chat chrome localisation. Covers /weather, /transport (+ all
  // sub-views), /hawker, /carpark, /forgetme, /language, /start intro.
  // Shared button labels (used across multiple surfaces).
  'button.back':               { en: '⬅️ Back', fr: '⬅️ Retour' ,
                  id: '⬅️ Kembali',
                  ru: '⬅️ Назад',
                  de: '⬅️ Zurück',
                  zh: '⬅️ 返回',
                  ja: '⬅️ 戻る',
                  es: '⬅️ Volver',
                  ko: '⬅️ 뒤로'
                },
  'button.refresh':            { en: '🔄 Refresh', fr: '🔄 Actualiser' ,
                     id: '🔄 Segarkan',
                     ru: '🔄 Обновить',
                     de: '🔄 Aktualisieren',
                     zh: '🔄 刷新',
                     ja: '🔄 更新',
                     es: '🔄 Actualizar',
                     ko: '🔄 새로고침'
                   },

  // /weather
  'weather.title':             { en: '☀️ Singapore weather', fr: '☀️ Météo de Singapour' ,
                    id: '☀️ Cuaca Singapura',
                    ru: '☀️ Погода в Сингапуре',
                    de: '☀️ Wetter in Singapur',
                    zh: '☀️ 新加坡天气',
                    ja: '☀️ シンガポールの天気',
                    es: '☀️ Clima de Singapur',
                    ko: '☀️ 싱가포르 날씨'
                  },
  'weather.temp':              { en: 'Temperature: {c}°C · {f}°F', fr: 'Température : {c} °C · {f} °F' ,
                   id: 'Suhu: {c}°C · {f}°F',
                   ru: 'Температура: {c}°C · {f}°F',
                   de: 'Temperatur: {c}°C · {f}°F',
                   zh: '温度：{c}°C · {f}°F',
                   ja: '温度：{c}°C · {f}°F',
                   es: 'Temperatura: {c}°C · {f}°F',
                   ko: '기온: {c}°C · {f}°F'
                 },
  'weather.humidity':          { en: 'Humidity: {pct}%', fr: 'Humidité : {pct} %' ,
                       id: 'Kelembapan: {pct}%',
                       ru: 'Влажность: {pct}%',
                       de: 'Luftfeuchtigkeit: {pct}%',
                       zh: '湿度：{pct}%',
                       ja: '湿度：{pct}%',
                       es: 'Humedad: {pct}%',
                       ko: '습도: {pct}%'
                     },
  'weather.rain':              { en: 'Rain: {mm} mm @ {at}', fr: 'Pluie : {mm} mm @ {at}' ,
                   id: 'Hujan: {mm} mm @ {at}',
                   ru: 'Осадки: {mm} мм @ {at}',
                   de: 'Regen: {mm} mm @ {at}',
                   zh: '降雨量：{mm}毫米 @ {at}',
                   ja: '降水量：{mm} mm @ {at}',
                   es: 'Lluvia: {mm} mm a {at}',
                   ko: '강수량: {mm} mm @ {at}'
                 },
  'weather.wind':              { en: 'Wind: {kt} kt{dir}', fr: 'Vent : {kt} kt{dir}' ,
                   id: 'Angin: {kt} kt{dir}',
                   ru: 'Ветер: {kt} кт{dir}',
                   de: 'Wind: {kt} kt{dir}',
                   zh: '风速：{kt} 节{dir}',
                   ja: '風速：{kt} ノット{dir}',
                   es: 'Viento: {kt} kt{dir}',
                   ko: '바람: {kt} kt{dir}'
                 },
  'weather.forecastNext2h':    { en: 'Next 2 hours in {area}: {desc}{valid}', fr: 'Prochaines 2 h à {area} : {desc}{valid}' ,
                             id: '2 jam berikutnya di {area}: {desc}{valid}',
                             ru: 'Следующие 2 часа в {area}: {desc}{valid}',
                             de: 'Nächste 2 Stunden in {area}: {desc}{valid}',
                             zh: '接下来两小时在{area}：{desc}{valid}',
                             ja: '{area}の今後 2 時間: {desc}{valid}',
                             es: 'Próximas 2 horas en {area}: {desc}{valid}',
                             ko: '{area}의 향후 2시간: {desc}{valid}'
                           },
  'weather.forecastUntil':     { en: ' (until {time})', fr: ' (jusqu’à {time})' ,
                            id: ' (hingga {time})',
                            ru: ' (до {time})',
                            de: ' (bis {time})',
                            zh: '（直到{time}）',
                            ja: '（{time}まで）',
                            es: ' (hasta {time})',
                            ko: ' ({time}까지)'
                          },
  'weather.unreachable':       { en: "Sorry, I can't reach the NEA weather feed right now.", fr: "Désolé, le flux météo NEA est inaccessible pour le moment." ,
                          id: 'Maaf, saya tidak bisa mengakses siaran cuaca NEA saat ini.',
                          ru: 'Извините, сейчас я не могу получить доступ к прогнозу погоды NEA.',
                          de: 'Tut mir leid, ich kann den NEA-Wetterfeed im Moment nicht erreichen.',
                          zh: '抱歉，我现在无法访问NEA天气预报。',
                          ja: '申し訳ありませんが、現在NEAの天気予報フィードにアクセスできません。',
                          es: 'Lo siento, no puedo acceder al servicio meteorológico de la NEA en este momento.',
                          ko: '죄송합니다, 지금은 NEA 날씨 정보를 가져올 수 없습니다.'
                        },
  // v0.60.118 — /weather expansion
  'weather.areaUnknown':       { en: "I don't know that area — try a town name like Tampines, or just /weather to use your shared pin.", fr: "Je ne connais pas cette zone — essayez un nom de quartier comme Tampines, ou simplement /weather pour utiliser votre position partagée." ,
                          id: 'Saya tidak mengenal daerah itu — coba nama kota seperti Tampines, atau cukup ketik /weather untuk menggunakan pin yang Anda bagikan.',
                          ru: 'Я не знаю этот район — попробуйте ввести название города, например, Тампинес, или просто /weather, чтобы использовать свою метку.',
                          de: 'Ich kenne diese Gegend nicht – versuchen Sie es mit einem Ortsnamen wie Tampines oder geben Sie einfach /weather ein, um Ihren geteilten Standort zu verwenden.',
                          es: 'No conozco esa zona; prueba con el nombre de una ciudad como Tampines, o simplemente /weather para usar el marcador que has compartido.'
                        ,
                          zh: '我不熟悉那个地区——试试淡滨尼之类的城镇名称，或者直接输入 /weather 来使用您共享的位置。',
                          ja: 'その地域はよく知らないので、タンピネスのような町名を試してみるか、/weather と入力して共有ピンを使ってみてください。',
                          ko: '해당 지역을 알 수 없습니다 — Tampines 같은 지역 이름을 입력하거나, /weather 로 공유된 위치를 사용하세요.'
                        },
  'weather.forArea':           { en: '— for {area} —', fr: '— pour {area} —' ,
                      id: '— untuk {area} —',
                      ru: '— для {area} —',
                      de: '— für {area} —',
                      zh: '— {area} —',
                      ja: '— {area}向け —',
                      es: '— para {area} —',
                      ko: '— {area} 기준 —'
                    },
  'weather.headOutRaining':    { en: "☔ Raining around {area} right now — hold ~20–30 min or pick somewhere covered.", fr: "☔ Il pleut autour de {area} en ce moment — patientez ~20–30 min ou choisissez un endroit couvert." ,
                             id: '☔ Saat ini sedang hujan di sekitar {area} — tunggu sekitar 20-30 menit atau pilih tempat yang terlindung.',
                             ru: '☔ Сейчас в районе {area} идёт дождь — подождите 20-30 минут или выберите место, защищенное от дождя.',
                             de: '☔ Es regnet gerade in der Gegend um {area} — warten Sie ~20–30 Minuten oder suchen Sie sich einen überdachten Ort.',
                             zh: '☔ 现在{area}附近正在下雨——请等待约20-30分钟或找个有遮挡的地方。',
                             ja: '☔ 現在、{area}周辺では雨が降っています。20～30分ほどお待ちいただくか、屋根のある場所へお進みください。',
                             es: '☔ Está lloviendo en los alrededores de {area} ahora mismo; espera entre 20 y 30 minutos o elige un lugar cubierto.',
                             ko: '☔ 지금 {area} 부근에 비가 내립니다 — 20~30분 정도 기다리거나 실내를 선택하세요.'
                           },
  'weather.headOutShowery':    { en: "🌦️ Dry now, but {area}'s 2-hour outlook is {desc} — head out soon if you're going somewhere open-air.", fr: "🌦️ Sec pour l’instant, mais les prévisions 2 h à {area} sont : {desc} — sortez bientôt si vous allez en plein air." ,
                             id: '🌦️ Saat ini kering, tetapi prakiraan cuaca 2 jam ke depan untuk {area} adalah {desc} — segera berangkat jika Anda akan pergi ke tempat terbuka.',
                             ru: '🌦️ Сейчас сухо, но прогноз на 2 часа для {area} — {desc}. Выходите пораньше, если собираетесь на открытый воздух.',
                             de: '🌦️ Im Moment ist es trocken, aber die 2-Stunden-Vorhersage für {area} lautet {desc} – wenn Sie irgendwo im Freien unterwegs sind, sollten Sie bald losziehen.',
                             zh: '🌦️ 现在天气干燥，但{area}的 2 小时天气预报为{desc} — 如果你要去户外场所，请尽快出发。',
                             ja: '🌦️ 今は乾燥していますが、{area}の 2 時間後の予報は{desc}です。屋外に出かける予定の方は、早めに出発してください。',
                             es: '🌦️ Ahora está seco, pero el pronóstico para las próximas 2 horas en {area} es {desc}; sal pronto si vas a algún lugar al aire libre.',
                             ko: '🌦️ 지금은 비가 오지 않지만 {area}의 2시간 예보는 {desc}입니다 — 야외로 나가실 계획이라면 서둘러 출발하세요.'
                           },
  'weather.headOutGood':       { en: "✅ Good window — {area} looks dry for the next 2 hours.", fr: "✅ Bon créneau — {area} devrait rester au sec pendant 2 h." ,
                          id: '✅ Waktu yang tepat — {area} terlihat kering selama 2 jam ke depan.',
                          ru: '✅ Хорошее окно — в {area} сухо ближайшие 2 часа.',
                          de: '✅ Gutes Wetterfenster — {area} sieht für die nächsten 2 Stunden trocken aus.',
                          zh: '✅ 天气晴好—— {area}未来2小时内看起来会很干燥。',
                          ja: '✅ 良い見通しです — {area}は今後 2 時間ほど乾燥した状態が続くようです。',
                          es: '✅ Buen momento: {area} parece seco durante las próximas 2 horas.',
                          ko: '✅ 지금이 좋은 때입니다 — {area}는 앞으로 2시간 동안 비가 오지 않을 것으로 보입니다.'
                        },
  'weather.hotNudge':          { en: "🥵 Feels hot out — an air-conditioned spot might be nicer.", fr: "🥵 Il fait chaud dehors — un endroit climatisé serait peut-être plus agréable." ,
                       id: '🥵 Cuacanya panas sekali — tempat ber-AC mungkin lebih nyaman.',
                       ru: '🥵 На улице жарко — в помещении с кондиционером было бы приятнее.',
                       de: '🥵 Es ist heiß draußen – ein klimatisierter Ort wäre vielleicht angenehmer.',
                       zh: '🥵 外面好热——有空调的地方会舒服些。',
                       ja: '🥵 外は暑いですね。エアコンの効いた場所の方がいいかもしれません。',
                       es: '🥵 Hace calor afuera; un lugar con aire acondicionado sería más agradable.',
                       ko: '🥵 밖이 덥습니다 — 에어컨이 있는 곳이 더 나을 수 있어요.'
                     },
  'weather.tonight':           { en: "🌙 Tonight in the {zone}: {desc}.", fr: "🌙 Ce soir dans le {zone} : {desc}." ,
                      id: '🌙 Malam ini di {zone}: {desc}.',
                      ru: '🌙 Сегодня вечером в {zone}: {desc}.',
                      de: '🌙 Heute Abend in der {zone}: {desc}.',
                      zh: '🌙 今晚在{zone}: {desc}。',
                      ja: '🌙 今夜の{zone}：{desc}。',
                      es: '🌙 Esta noche en la {zone}: {desc}.',
                      ko: '🌙 오늘 밤 {zone} 지역: {desc}.'
                    },
  // per-pick rain caveat (rendered on open-air venue cards)
  'weather.rainNowNear':       { en: "🌧️ Raining around {area} right now — covered seating helps.", fr: "🌧️ Il pleut autour de {area} en ce moment — un coin couvert est préférable." ,
                          id: '🌧️ Hujan turun di sekitar {area} saat ini — tempat duduk yang terlindungi sangat membantu.',
                          ru: '🌧️ Сейчас в районе {area} идёт дождь — крытые места для сидения очень помогают.',
                          de: '🌧️ Es regnet gerade in der Gegend um {area} – überdachte Sitzgelegenheiten helfen.',
                          zh: '🌧️现在{area}附近正在下雨——有遮雨棚的座位很有帮助。',
                          ja: '🌧️ 現在、{area}周辺では雨が降っています。屋根付きの座席があると便利です。',
                          es: '🌧️ Está lloviendo en {area} ahora mismo; sentarse bajo techo ayuda.',
                          ko: '🌧️ 지금 {area} 주변에 비가 내리고 있습니다 — 지붕이 있는 좌석이 좋겠습니다.'
                        },
  'weather.rainSoonNear':      { en: "🌧️ {desc} in {area}'s 2-hour outlook — covered seating helps.", fr: "🌧️ Prévisions 2 h à {area} : {desc} — un coin couvert est préférable." ,
                           id: '🌧️ {desc} dalam prakiraan 2 jam untuk {area} — tempat duduk beratap sangat membantu.',
                           ru: '🌧️ {desc} в прогнозе на 2 часа для {area} — места под навесом помогут.',
                           de: '🌧️ {desc} in der 2-Stunden-Vorhersage für {area} — überdachte Sitzplätze helfen.',
                           zh: '🌧️ 未来 2 小时 {area} 预计{desc} — 有遮挡的座位会更好。',
                           ja: '🌧️ {area}の2時間予報は{desc} — 屋根付きの座席が役立ちます。',
                           es: '🌧️ {desc} en el pronóstico de 2 horas de {area}; los asientos cubiertos ayudan.',
                           ko: '🌧️ {area}의 2시간 예보는 {desc}입니다 — 지붕이 있는 좌석이 좋겠습니다.'
                         },

  // /carpark
  'carpark.offline':           { en: 'Carpark lookup is offline (LTA key not configured).', fr: 'Recherche de parking hors-ligne (clé LTA non configurée).' ,
                      id: 'Pencarian tempat parkir sedang offline (kunci LTA belum dikonfigurasi).',
                      ru: 'Поиск парковки недоступен (ключ LTA не настроен).',
                      de: 'Parkplatzsuche offline (LTA-Schlüssel nicht konfiguriert).',
                      zh: '停车场查询功能已离线（LTA密钥未配置）。',
                      ja: '駐車場検索はオフラインです（LTAキーが設定されていません）。',
                      es: 'La búsqueda de aparcamientos no está disponible (la clave LTA no está configurada).',
                      ko: '주차장 조회가 오프라인 상태입니다 (LTA 키가 설정되지 않았습니다).'
                    },
  'carpark.lookingUp':         { en: '🅿️ Looking up nearest carparks…', fr: '🅿️ Recherche des parkings les plus proches…' ,
                        id: '🅿️ Mencari lokasi parkir terdekat…',
                        ru: '🅿️ Поиск ближайших парковок…',
                        de: '🅿️ Suche nach den nächstgelegenen Parkplätzen…',
                        zh: '🅿️ 正在查找附近的停车场…',
                        ja: '🅿️ 最寄りの駐車場を検索中…',
                        es: '🅿️ Buscando aparcamientos cercanos…',
                        ko: '🅿️ 가장 가까운 주차장을 찾는 중…'
                      },
  'carpark.none':              { en: 'No carparks with available lots near here.', fr: 'Aucun parking avec places disponibles à proximité.' ,
                   id: 'Tidak ada tempat parkir dengan slot kosong di dekat sini.',
                   ru: 'Поблизости нет свободных парковочных мест.',
                   de: 'In der Nähe gibt es keine Parkplätze mit freien Stellplätzen.',
                   zh: '附近没有空余车位的停车场。',
                   ja: 'この付近には空き駐車場がありません。',
                   es: 'No hay aparcamientos con plazas disponibles cerca de aquí.',
                   ko: '이 근처에 빈자리가 있는 주차장이 없습니다.'
                 },
  'carpark.header':            { en: '🅿️ Nearest carparks with available lots', fr: '🅿️ Parkings les plus proches avec places disponibles' ,
                     id: '🅿️ Tempat parkir terdekat dengan slot yang tersedia',
                     ru: '🅿️ Ближайшие парковки со свободными местами',
                     de: '🅿️ Nächstgelegene Parkplätze mit freien Stellplätzen',
                     zh: '🅿️ 附近有空位的停车场',
                     ja: '🅿️ 空きのある最寄りの駐車場',
                     es: '🅿️ Aparcamientos más cercanos con plazas disponibles',
                     ko: '🅿️ 빈자리가 있는 가장 가까운 주차장'
                   },
  'carpark.row':               { en: '{i}. {name}  ·  {lots} lots  ·  {dist}', fr: '{i}. {name}  ·  {lots} places  ·  {dist}' ,
                  id: '{i}. {name} · {lots} slot · {dist}',
                  ru: '{i}. {name} · {lots} мест · {dist}',
                  de: '{i}. {name} · {lots} Plätze · {dist}',
                  zh: '{i}. {name} · {lots} 个空位 · {dist}',
                  ja: '{i}. {name} · {lots} 台分 · {dist}',
                  es: '{i}. {name} · {lots} plazas · {dist}',
                  ko: '{i}. {name}  ·  {lots}면  ·  {dist}'
                },
  'carpark.mapAllCaption':     { en: 'Showing closest locations:', fr: 'Emplacements les plus proches :' ,
                            id: 'Menampilkan lokasi terdekat:',
                            ru: 'Показаны ближайшие места:',
                            de: 'Nächstgelegene Standorte werden angezeigt:',
                            zh: '显示最近地点：',
                            ja: '最寄りの場所を表示しています：',
                            es: 'Mostrando ubicaciones más cercanas:',
                            ko: '가장 가까운 위치를 표시합니다:'
                          },
  'carpark.mapAllBtn':         { en: 'Compare all {n} carparks', fr: 'Comparer les {n} parkings' ,
                        id: 'Bandingkan semua {n} tempat parkir',
                        ru: 'Сравнить все парковки ({n})',
                        de: 'Vergleiche alle {n} Parkplätze',
                        zh: '比较全部 {n} 个停车场',
                        ja: '{n}箇所の駐車場をすべて比較',
                        es: 'Comparar los {n} aparcamientos',
                        ko: '{n}개 주차장 모두 비교'
                      },
  'carpark.containerCaption':  { en: '🗺 Open all 5 carparks in one Google Maps container:', fr: '🗺 Ouvrir les 5 parkings dans un conteneur Google Maps :' ,
                               id: '🗺 Buka kelima tempat parkir dalam satu kontainer Google Maps:',
                               ru: '🗺 Откройте все 5 парковок в одном контейнере Google Maps:',
                               de: '🗺 Alle 5 Parkplätze in einem Google Maps-Container öffnen:',
                               zh: '🗺 在谷歌地图容器中打开全部 5 个停车场：',
                               ja: '🗺 5つの駐車場すべてを1つのGoogleマップコンテナで開く：',
                               es: '🗺 Abre los 5 aparcamientos en un solo contenedor de Google Maps:',
                               ko: '🗺 구글 지도 한 화면에서 주차장 5곳을 모두 열기:'
                             },
  'carpark.viewAllBtn':        { en: '🗺 View all carparks', fr: '🗺 Voir tous les parkings' ,
                         id: '🗺 Lihat semua tempat parkir',
                         ru: '🗺 Посмотреть все парковки',
                         de: '🗺 Alle Parkplätze anzeigen',
                         zh: '🗺 查看所有停车场',
                         ja: '🗺 全ての駐車場を見る',
                         es: '🗺 Ver todos los aparcamientos',
                         ko: '🗺 모든 주차장 보기'
                       },
  'carpark.unreachable':       { en: "Sorry, I can't reach the LTA carpark feed right now.", fr: "Désolé, le flux LTA des parkings est inaccessible pour le moment." ,
                          id: 'Maaf, saya tidak bisa mengakses feed parkir LTA saat ini.',
                          ru: 'Извините, сейчас я не могу получить доступ к данным о парковках LTA.',
                          de: 'Tut mir leid, ich kann den LTA-Parkplatz-Feed im Moment nicht erreichen.',
                          zh: '抱歉，我现在无法访问陆路交通管理局停车场的数据流。',
                          ja: '申し訳ありませんが、現在LTAの駐車場フィードにアクセスできません。',
                          es: 'Lo siento, no puedo acceder a la fuente de datos del aparcamiento de la LTA en este momento.',
                          ko: '죄송합니다. 지금은 LTA 주차장 정보에 연결할 수 없습니다.'
                        },

  // /hawker
  'hawker.title':              { en: '🍚 Singapore Hawker Centres & Food Centres (2025). By NEA', fr: '🍚 Centres de hawkers et de restauration de Singapour (2025). Par la NEA' ,
                   id: '🍚 Pusat Jajanan & Pusat Makanan Singapura (2025). Oleh NEA',
                   ru: '🍚 Центры уличной еды и фуд-корты Сингапура (2025). Проект NEA.',
                   de: '🍚 Singapurs Hawker-Zentren und Food-Center (2025). Von der NEA',
                   zh: '🍚 新加坡小贩中心及美食中心（2025）。由国家环境局发布。',
                   ja: '🍚 シンガポールのホーカーセンターとフードセンター（2025年）。NEAによる',
                   es: '🍚 Centros de comida callejera y centros gastronómicos de Singapur (2025). Por NEA',
                   ko: '🍚 싱가포르 호커센터 및 푸드센터 (2025). NEA 제공'
                 },
  'hawker.openTmaBtn':         { en: '🍚 Open Hawker Centre', fr: '🍚 Ouvrir l’app Hawker' ,
                        id: '🍚 Buka Pusat Jajanan',
                        ru: '🍚 Открыть центр уличной еды',
                        de: '🍚 Hawker-Zentrum öffnen',
                        zh: '🍚 打开小贩中心',
                        ja: '🍚 ホーカーセンターを開く',
                        es: '🍚 Abrir centro de comida callejera',
                        ko: '🍚 호커센터 열기'
                      },

  // /transport top menu
  'transport.menu.title':      { en: '🇸🇬 *Transport*', fr: '🇸🇬 *Transports*' ,
                           id: '🇸🇬 *Transportasi*',
                           ru: '🇸🇬 *Транспорт*',
                           de: '🇸🇬 *Verkehr*',
                           zh: '🇸🇬 *交通*',
                           ja: '🇸🇬 *交通機関*',
                           es: '🇸🇬 *Transporte*',
                           ko: '🇸🇬 *교통*'
                         },
  'transport.menu.btn.train':       { en: '🚇 Train', fr: '🚇 Métro' ,
                               id: '🚇 Kereta',
                               ru: '🚇 Метро',
                               de: '🚇 Bahn',
                               zh: '🚇 地铁',
                               ja: '🚇 電車',
                               es: '🚇 Tren',
                               ko: '🚇 지하철'
                             },
  'transport.menu.btn.bus':         { en: '🚌 Bus', fr: '🚌 Bus' ,
                             id: '🚌 Bus',
                             ru: '🚌 Автобус',
                             de: '🚌 Bus',
                             zh: '🚌 公交车',
                             ja: '🚌 バス',
                             es: '🚌 Autobús',
                             ko: '🚌 버스'
                           },
  'transport.menu.btn.incidents':   { en: '🚦 Incidents', fr: '🚦 Incidents' ,
                                   id: '🚦 Insiden',
                                   ru: '🚦 Инциденты',
                                   de: '🚦 Vorfälle',
                                   zh: '🚦 路况事件',
                                   ja: '🚦 交通障害',
                                   es: '🚦 Incidentes',
                                   ko: '🚦 교통 상황'
                                 },
  'transport.menu.btn.drive':       { en: '🚗 Drive', fr: '🚗 Voiture' ,
                               id: '🚗 Mengemudi',
                               ru: '🚗 Вождение',
                               de: '🚗 Fahren',
                               zh: '🚗 驾车',
                               ja: '🚗 ドライブ',
                               es: '🚗 Conducir',
                               ko: '🚗 운전'
                             },
  'transport.menu.btn.refreshLoc':  { en: '📍 Refresh location', fr: '📍 Actualiser la position' ,
                                    id: '📍 Segarkan lokasi',
                                    ru: '📍 Обновить местоположение',
                                    de: '📍 Standort aktualisieren',
                                    zh: '📍刷新位置',
                                    ja: '📍 場所を更新',
                                    es: '📍 Actualizar ubicación',
                                    ko: '📍 위치 새로고침'
                                  },

  // /transport bus sub-menu
  'transport.bus.menu.title':       { en: '🚌 Bus Information', fr: '🚌 Informations bus' ,
                               id: '🚌 Informasi Bus',
                               ru: '🚌 Информация об автобусах',
                               de: '🚌 Businformationen',
                               zh: '🚌 公交信息',
                               ja: '🚌 バス情報',
                               es: '🚌 Información sobre autobuses',
                               ko: '🚌 버스 정보'
                             },
  'transport.bus.menu.btn.nearest': { en: 'Nearest Bus Stops', fr: 'Arrêts de bus proches' ,
                                     id: 'Halte Bus Terdekat',
                                     ru: 'Ближайшие автобусные остановки',
                                     de: 'Nächstgelegene Bushaltestellen',
                                     zh: '最近的公交车站',
                                     ja: '最寄りのバス停',
                                     es: 'Paradas de autobús más cercanas',
                                     ko: '가장 가까운 버스 정류장'
                                   },
  'transport.bus.menu.btn.route':   { en: '🗺 Plan a route', fr: '🗺 Planifier un itinéraire' ,
                                   id: '🗺 Rencanakan rute',
                                   ru: '🗺 Составьте маршрут',
                                   de: '🗺 Route planen',
                                   zh: '🗺 规划路线',
                                   ja: '🗺 ルートを計画する',
                                   es: '🗺 Planifica una ruta',
                                   ko: '🗺 경로 계획하기'
                                 },

  // /transport train view
  'transport.train.heading':        { en: '🚇 Train (MRT)', fr: '🚇 Métro (MRT)' ,
                              id: '🚇 Kereta (MRT)',
                              ru: '🚇 Метро (MRT)',
                              de: '🚇 Bahn (MRT)',
                              zh: '🚇 地铁（MRT）',
                              ja: '🚇 電車（MRT）',
                              es: '🚇 Tren (MRT)',
                              ko: '🚇 지하철 (MRT)'
                            },
  'transport.train.status':         { en: 'Status: {status}', fr: 'État : {status}' ,
                             id: 'Status: {status}',
                             ru: 'Статус: {status}',
                             de: 'Status: {status}',
                             zh: '状态：{status}',
                             ja: 'ステータス: {status}',
                             es: 'Estado: {status}',
                             ko: '상태: {status}'
                           },
  'transport.train.notes':          { en: 'Notes: {note}', fr: 'Remarques : {note}' ,
                            id: 'Catatan: {note}',
                            ru: 'Примечания: {note}',
                            de: 'Anmerkungen: {note}',
                            zh: '备注：{note}',
                            ja: '注記: {note}',
                            es: 'Notas: {note}',
                            ko: '참고: {note}'
                          },
  'transport.train.refreshed':      { en: 'Refreshed: {at}', fr: 'Actualisé : {at}' ,
                                id: 'Diperbarui: {at}',
                                ru: 'Обновлено: {at}',
                                de: 'Aktualisiert: {at}',
                                zh: '已刷新：{at}',
                                ja: '更新日時: {at}',
                                es: 'Actualizado: {at}',
                                ko: '갱신 시각: {at}'
                              },
  'transport.train.warmup':         { en: 'Status: 🟡 warming up; try again in 30 s.', fr: 'État : 🟡 démarrage en cours ; réessayez dans 30 s.' ,
                             id: 'Status: 🟡 sedang pemanasan; coba lagi dalam 30 detik.',
                             ru: 'Статус: 🟡 разогреваемся; попробуйте снова через 30 с.',
                             de: 'Status: 🟡 Aufwärmen; versuchen Sie es in 30 Sekunden erneut.',
                             zh: '状态：🟡 正在预热；30 秒后再试。',
                             ja: '状態: 🟡 ウォーミングアップ中。30秒後にもう一度お試しください。',
                             es: 'Estado: 🟡 Calentando; inténtalo de nuevo en 30 s.',
                             ko: '상태: 🟡 준비 중입니다. 30초 후에 다시 시도해 주세요.'
                           },
  'transport.train.crowd.l':        { en: '🟢 low', fr: '🟢 faible' ,
                              id: '🟢 rendah',
                              ru: '🟢 низкий',
                              de: '🟢 niedrig',
                              zh: '🟢 低',
                              ja: '🟢 低い',
                              es: '🟢 bajo',
                              ko: '🟢 여유'
                            },
  'transport.train.crowd.m':        { en: '🟡 medium', fr: '🟡 moyen' ,
                              id: '🟡 sedang',
                              ru: '🟡 средний',
                              de: '🟡 mittel',
                              zh: '🟡 中等',
                              ja: '🟡 中',
                              es: '🟡 medio',
                              ko: '🟡 보통'
                            },
  'transport.train.crowd.h':        { en: '🔴 high', fr: '🔴 élevé' ,
                              id: '🔴 tinggi',
                              ru: '🔴 высокий',
                              de: '🔴 hoch',
                              zh: '🔴 高',
                              ja: '🔴 高い',
                              es: '🔴 alto',
                              ko: '🔴 혼잡'
                            },
  'transport.train.nearestHeader':  { en: '🚇 Nearest 3 Train stations{wx}', fr: '🚇 3 stations de train les plus proches{wx}' ,
                                    id: '🚇 3 Stasiun Kereta Terdekat{wx}',
                                    ru: '🚇 3 ближайшие станции метро{wx}',
                                    de: '🚇 Die 3 nächstgelegenen MRT-Stationen{wx}',
                                    zh: '🚇 最近的 3 个地铁站{wx}',
                                    ja: '🚇 最寄りの3つの駅{wx}',
                                    es: '🚇 Las 3 estaciones de tren más cercanas{wx}',
                                    ko: '🚇 가장 가까운 지하철역 3곳{wx}'
                                  },
  'transport.train.noLocation':     { en: '🚇 Share your location once and Soleat will list the nearest MRT stations too.', fr: '🚇 Partagez votre position une fois et Soleat listera aussi les stations MRT les plus proches.' ,
                                 id: '🚇 Bagikan lokasi Anda sekali saja dan Soleat akan menampilkan stasiun MRT terdekat juga.',
                                 ru: '🚇 Укажите свое местоположение один раз, и Soleat также покажет ближайшие станции метро.',
                                 de: '🚇 Teilen Sie Ihren Standort einmalig mit, und Soleat listet Ihnen auch die nächstgelegenen MRT-Stationen auf.',
                                 zh: '🚇 分享一次您的位置，Soleat 就会列出最近的地铁站。',
                                 ja: '🚇 一度現在地を共有すると、Soleat が最寄りの MRT 駅も表示します。',
                                 es: '🚇 Comparte tu ubicación una sola vez y Soleat también te mostrará las estaciones de MRT más cercanas.',
                                 ko: '🚇 위치를 한 번만 공유해 주시면 Soleat이 가장 가까운 MRT 역도 알려드립니다.'
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
                                  es: '🟢 La red no está saturada: 0 de {total} plataformas superan la baja densidad.',
                                  ko: '🟢 전체적으로 한산합니다 — 전체 {total}개 승강장 중 여유 수준을 넘는 곳은 0곳입니다.'
                                },
  'transport.train.network.medium': { en: '🟡 {medium} moderate · {high} high (of {total}) — Lines: {lines}',
                                      fr: '🟡 {medium} modéré · {high} élevé (sur {total}) — Lignes : {lines}' ,
                                     id: '🟡 {medium} sedang · {high} tinggi (dari {total}) — Jalur: {lines}',
                                     ru: '🟡 {medium} умеренно · {high} высоко (из {total}) — Линии: {lines}',
                                     de: '🟡 {medium} moderat · {high} hoch (von {total}) — Linien: {lines}',
                                     zh: '🟡 {medium} 个中等 · {high} 个高（共 {total} 个）— 线路：{lines}',
                                     ja: '🟡 {medium}中程度 · {high}高（{total}件中）— 路線: {lines}',
                                     es: '🟡 {medium} moderado · {high} alto (de {total}) — Líneas: {lines}',
                                     ko: '🟡 보통 {medium}곳 · 혼잡 {high}곳 (전체 {total}곳) — 노선: {lines}'
                                   },
  'transport.train.network.high':   { en: '🔴 {high} high · {medium} moderate (of {total}) — Lines: {lines}',
                                      fr: '🔴 {high} élevé · {medium} modéré (sur {total}) — Lignes : {lines}' ,
                                   id: '🔴 {high} tinggi · {medium} moderat (dari {total}) — Jalur: {lines}',
                                   ru: '🔴 {high} высоко · {medium} умеренно (из {total}) — Линии: {lines}',
                                   de: '🔴 {high} hoch · {medium} mittel (von {total}) — Linien: {lines}',
                                   zh: '🔴 {high} 个高 · {medium} 个中等（共 {total} 个）— 线路：{lines}',
                                   ja: '🔴 {high}高 · {medium}中程度（{total}件中）— 路線: {lines}',
                                   es: '🔴 {high} alto · {medium} moderado (de {total}) — Líneas: {lines}',
                                   ko: '🔴 혼잡 {high}곳 · 보통 {medium}곳 (전체 {total}곳) — 노선: {lines}'
                                 },
  'transport.train.affectedLines':  { en: '⚠️ Affected lines:', fr: '⚠️ Lignes affectées :' ,
                                    id: '⚠️ Jalur yang terpengaruh:',
                                    ru: '⚠️ Затронутые линии:',
                                    de: '⚠️ Betroffene Linien:',
                                    zh: '⚠️受影响的线路：',
                                    ja: '⚠️ 影響を受ける路線:',
                                    es: '⚠️ Líneas afectadas:',
                                    ko: '⚠️ 영향을 받는 노선:'
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
                              es: '⏱️ Frecuencia: {peakMin}–{peakMax} min hora punta · {offMin}–{offMax} min fuera de hora punta (publicado por LTA)',
                              ko: '⏱️ 배차 간격: 혼잡 시간대 {peakMin}–{peakMax}분 · 그 외 시간대 {offMin}–{offMax}분 (LTA 공표)'
                            },
  // v0.60.97 — operator: spell "d" as "days" / "jours".
  'transport.train.engineering':    { en: '🔧 Upcoming engineering (next 7 days):', fr: '🔧 Travaux à venir (sous 7 jours) :' ,
                                  id: '🔧 Pekerjaan perawatan mendatang (7 hari ke depan):',
                                  ru: '🔧 Предстоящие инженерные работы (в течение следующих 7 дней):',
                                  de: '🔧 Anstehende Bauarbeiten (nächste 7 Tage):',
                                  zh: '🔧 即将进行的工程（未来7天）：',
                                  ja: '🔧 今後の保守工事（今後7日間）：',
                                  es: '🔧 Próximas obras de mantenimiento (próximos 7 días):',
                                  ko: '🔧 예정된 유지보수 공사 (향후 7일):'
                                },
  // v0.60.98 — operator: rename to '🇸🇬 Train Map and Status' so
  // the chat CTA reads as a destination, not an action verb.
  'transport.train.openMapBtn':     { en: '🇸🇬 Train Map and Status', fr: '🇸🇬 Carte et état des trains' ,
                                 id: '🇸🇬 Peta dan Status Kereta',
                                 ru: '🇸🇬 Карта и статус метро',
                                 de: '🇸🇬 Zugnetzplan und Status',
                                 zh: '🇸🇬 地铁线路图和状态',
                                 ja: '🇸🇬 列車の路線図と運行状況',
                                 es: '🇸🇬 Mapa y estado de los trenes',
                                 ko: '🇸🇬 지하철 노선도 및 운행 상황'
                               },
  'transport.train.unreachable':    { en: "Sorry, I can't reach the MRT feed right now.", fr: "Désolé, le flux MRT est inaccessible pour le moment." ,
                                  id: 'Maaf, saya tidak bisa mengakses siaran MRT saat ini.',
                                  ru: 'Извините, сейчас не удаётся получить данные MRT.',
                                  de: 'Tut mir leid, ich kann den MRT-Feed im Moment nicht erreichen.',
                                  zh: '抱歉，我现在无法获取地铁数据。',
                                  ja: '申し訳ありませんが、現在MRTのフィードにアクセスできません。',
                                  es: 'Lo siento, no puedo acceder a los datos del MRT en este momento.',
                                  ko: '죄송합니다. 지금은 MRT 정보에 연결할 수 없습니다.'
                                },

  // /transport bus
  'transport.bus.noLocation':       { en: '🚌 I need your location first — share it once via the menu (📍) and Soleat will remember.', fr: '🚌 J’ai d’abord besoin de votre position — partagez-la une fois via le menu (📍) et Soleat s’en souviendra.' ,
                               id: '🚌 Saya perlu lokasi Anda terlebih dahulu — bagikan sekali melalui menu (📍) dan Soleat akan mengingatnya.',
                               ru: '🚌 Сначала мне нужно ваше местоположение — укажите его один раз через меню (📍), и Soleat запомнит его.',
                               de: '🚌 Zuerst benötige ich Ihren Standort – teilen Sie ihn einmal über das Menü (📍) mit, und Soleat wird ihn sich merken.',
                               zh: '🚌 我需要先知道您的位置——通过菜单（📍）分享一次，Soleat 就会记住。',
                               ja: '🚌 まずあなたの現在地が必要です。メニューから一度共有してください（📍）。そうすればSoleatが記憶します。',
                               es: '🚌 Primero necesito tu ubicación; compártela una vez a través del menú (📍) y Soleat lo recordará.',
                               ko: '🚌 먼저 위치가 필요합니다 — 메뉴(📍)에서 한 번만 공유해 주시면 Soleat이 기억합니다.'
                             },
  'transport.bus.offline':          { en: '🚌 Bus lookup is offline (LTA key not configured).', fr: '🚌 Recherche de bus hors-ligne (clé LTA non configurée).' ,
                            id: '🚌 Pencarian bus sedang offline (kunci LTA belum dikonfigurasi).',
                            ru: '🚌 Поиск автобусов недоступен (ключ LTA не настроен).',
                            de: '🚌 Bussuche offline (LTA-Schlüssel nicht konfiguriert).',
                            zh: '🚌 公交车查询已离线（LTA 密钥未配置）。',
                            ja: '🚌 バス検索はオフラインです（LTAキーが設定されていません）。',
                            es: '🚌 La búsqueda de autobuses no está disponible (la clave LTA no está configurada).',
                            ko: '🚌 버스 조회가 오프라인 상태입니다 (LTA 키가 설정되지 않았습니다).'
                          },
  'transport.bus.noStopsNearest':   { en: '🚏 No bus stops within 800 m of your saved location.', fr: '🚏 Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' ,
                                   id: '🚏 Tidak ada halte bus dalam radius 800 m dari lokasi yang Anda simpan.',
                                   ru: '🚏 В радиусе 800 м от вашего сохраненного местоположения нет автобусных остановок.',
                                   de: '🚏 Keine Bushaltestellen im Umkreis von 800 m um Ihren gespeicherten Standort.',
                                   zh: '🚏 您保存的位置附近 800 米内没有公交车站。',
                                   ja: '🚏 保存した場所から800m以内にバス停はありません。',
                                   es: '🚏 No hay paradas de autobús a menos de 800 m de tu ubicación guardada.',
                                   ko: '🚏 저장된 위치에서 800m 이내에 버스 정류장이 없습니다.'
                                 },
  'transport.bus.nearestHeader':    { en: '🚏 Nearest {count} bus stops', fr: '🚏 {count} arrêts de bus les plus proches' ,
                                  id: '🚏 {count} halte bus terdekat',
                                  ru: '🚏 {count} ближайших автобусных остановок',
                                  de: '🚏 Nächstgelegene {count} Bushaltestellen',
                                  zh: '🚏 最近的{count}个公交车站',
                                  ja: '🚏 最寄りのバス停 {count} 件',
                                  es: '🚏 Las {count} paradas de autobús más cercanas',
                                  ko: '🚏 가장 가까운 버스 정류장 {count}곳'
                                },
  'transport.bus.stopMetaFirst':    { en: '🚏 Bus Stop № {code} is 📍 {dist} away from current location.', fr: '🚏 Arrêt de bus № {code} à 📍 {dist} de votre position actuelle.' ,
                                  id: '🚏 Halte Bus No. {code} berjarak 📍 {dist} dari lokasi Anda saat ini.',
                                  ru: '🚏 Автобусная остановка № {code} — 📍 {dist} от текущего местоположения.',
                                  de: '🚏 Bushaltestelle Nr. {code} ist 📍 {dist} von Ihrem aktuellen Standort entfernt.',
                                  zh: '🚏 公交车站 № {code}距离当前位置 📍 {dist}。',
                                  ja: '🚏 バス停番号{code}は現在地から 📍 {dist}離れています。',
                                  es: '🚏 La parada de autobús nº {code} está a 📍 {dist} de distancia de la ubicación actual.',
                                  ko: '🚏 버스 정류장 № {code}은(는) 현재 위치에서 📍 {dist} 떨어져 있습니다.'
                                },
  'transport.bus.stopMetaRest':     { en: '🚏 Bus Stop № {code} · 📍 {dist}', fr: '🚏 Arrêt de bus № {code} · 📍 {dist}' ,
                                 id: '🚏 Halte Bus No. {code} · 📍 {dist}',
                                 ru: '🚏 Автобусная остановка № {code} · 📍 {dist}',
                                 de: '🚏 Bushaltestelle Nr. {code} · 📍 {dist}',
                                 zh: '🚏 公交车站 № {code} · 📍 {dist}',
                                 ja: '🚏 バス停番号{code} · 📍 {dist}',
                                 es: '🚏 Parada de autobús nº {code} · 📍 {dist}',
                                 ko: '🚏 버스 정류장 № {code} · 📍 {dist}'
                               },
  'transport.bus.stopRow':          { en: '· {desc} ({road}) — {dist}', fr: '· {desc} ({road}) — {dist}' ,
                            id: '· {desc} ({road}) — {dist}',
                            ru: '· {desc} ({road}) — {dist}',
                            de: '· {desc} ({road}) — {dist}',
                            zh: '· {desc} ({road}) — {dist}',
                            ja: '・{desc}（{road}）— {dist}',
                            es: '· {desc} ({road}) — {dist}',
                            ko: '· {desc} ({road}) — {dist}'
                          },
  'transport.bus.stopCode':         { en: '  Code: {code}', fr: '  Code : {code}' ,
                             id: '  Kode: {code}',
                             ru: '  Код: {code}',
                             de: '  Code: {code}',
                             zh: '  编号：{code}',
                             ja: '  番号: {code}',
                             es: '  Código: {code}',
                             ko: '  번호: {code}'
                           },
  'transport.bus.noStopsArrivals':  { en: '⏱ No bus stops within 800 m of your saved location.', fr: '⏱ Aucun arrêt de bus à moins de 800 m de votre position enregistrée.' ,
                                    id: '⏱ Tidak ada halte bus dalam radius 800 m dari lokasi yang Anda simpan.',
                                    ru: '⏱ В радиусе 800 м от сохраненного вами местоположения нет автобусных остановок.',
                                    de: '⏱ Keine Bushaltestellen im Umkreis von 800 m um Ihren gespeicherten Standort.',
                                    zh: '⏱ 您保存的位置附近 800 米内没有公交车站。',
                                    ja: '⏱ 保存した場所から800m以内にバス停はありません。',
                                    es: '⏱ No hay paradas de autobús a menos de 800 m de tu ubicación guardada.',
                                    ko: '⏱ 저장된 위치에서 800m 이내에 버스 정류장이 없습니다.'
                                  },
  'transport.bus.arrivalsHeader':   { en: '⏱ Next arrivals — top 3 nearest stops', fr: '⏱ Prochains passages — 3 arrêts les plus proches' ,
                                   id: '⏱ Kedatangan berikutnya — 3 halte terdekat',
                                   ru: '⏱ Следующие прибытия — 3 ближайшие остановки',
                                   de: '⏱ Nächste Ankünfte – die 3 nächstgelegenen Haltestellen',
                                   zh: '⏱ 下一班公交 — 最近的 3 个站点',
                                   ja: '⏱ 次のバス到着 — 最寄りの3停留所',
                                   es: '⏱ Próximas llegadas: las 3 paradas más cercanas',
                                   ko: '⏱ 다음 도착 — 가장 가까운 정류장 3곳'
                                 },
  'transport.bus.noLive':           { en: '  no real-time arrivals', fr: '  aucun passage en temps réel' ,
                           id: '  tidak ada kedatangan secara real-time',
                           ru: '  нет данных о прибытии в режиме реального времени',
                           de: '  keine Echtzeit-Ankünfte',
                           zh: '  没有实时到达信息',
                           ja: '  リアルタイムの到着情報はありません',
                           es: '  sin llegadas en tiempo real',
                           ko: '  실시간 도착 정보 없음'
                         },
  'transport.bus.noStopsCrowd':     { en: '👥 No bus stops within 800 m to sample.', fr: '👥 Aucun arrêt de bus à moins de 800 m à échantillonner.' ,
                                 id: '👥 Tidak ada halte bus dalam radius 800 m untuk disurvei.',
                                 ru: '👥 В радиусе 800 м нет автобусных остановок для выборки.',
                                 de: '👥 Keine Bushaltestellen im Umkreis von 800 m für eine Stichprobe.',
                                 zh: '👥 800 米内没有可供采样的公交车站。',
                                 ja: '👥 800m以内にサンプリングできるバス停はありません。',
                                 es: '👥 No hay paradas de autobús a menos de 800 m para muestrear.',
                                 ko: '👥 800m 이내에 조사할 버스 정류장이 없습니다.'
                               },
  'transport.bus.loadHeader':       { en: '👥 Bus load — sampled across nearest 3 stops', fr: '👥 Charge des bus — échantillon des 3 arrêts proches' ,
                               id: '👥 Jumlah penumpang bus — diambil sampel dari 3 halte terdekat',
                               ru: '👥 Загруженность автобуса — выборка произведена на 3 ближайших остановках',
                               de: '👥 Busauslastung – Stichprobe an den 3 nächstgelegenen Haltestellen',
                               zh: '👥 公交车载客量 — 取自附近 3 个站点的样本数据',
                               ja: '👥 バスの乗車率 — 最寄りの3つの停留所でサンプリング',
                               es: '👥 Ocupación del autobús: muestra tomada en las 3 paradas más cercanas.',
                               ko: '👥 버스 혼잡도 — 가장 가까운 정류장 3곳 기준'
                             },
  'transport.bus.load.seats':       { en: 'Seats Available: {n}', fr: 'Places assises : {n}' ,
                               id: 'Kursi Tersedia: {n}',
                               ru: 'Сидячих мест: {n}',
                               de: 'Verfügbare Sitzplätze: {n}',
                               zh: '剩余座位：{n}',
                               ja: '空席：{n}',
                               es: 'Asientos disponibles: {n}',
                               ko: '좌석 여유: {n}'
                             },
  'transport.bus.load.standing':    { en: 'Standing Available: {n}', fr: 'Places debout : {n}' ,
                                  id: 'Tersedia tempat berdiri: {n}',
                                  ru: 'Стоячих мест: {n}',
                                  de: 'Stehplätze verfügbar: {n}',
                                  zh: '可站立空位：{n}',
                                  ja: '立席：{n}',
                                  es: 'Plazas de pie disponibles: {n}',
                                  ko: '입석 여유: {n}'
                                },
  'transport.bus.load.limited':     { en: 'Limited Standing: {n}', fr: 'Debout limité : {n}' ,
                                 id: 'Tempat Berdiri Terbatas: {n}',
                                 ru: 'Мало стоячих мест: {n}',
                                 de: 'Begrenzte Stehplätze: {n}',
                                 zh: '站立空位不多：{n}',
                                 ja: '立席わずか：{n}',
                                 es: 'Plazas de pie limitadas: {n}',
                                 ko: '입석 여유 적음: {n}'
                               },
  'transport.bus.load.footer':      { en: '(of {n} services with live load data)', fr: '(sur {n} services avec données de charge en direct)' ,
                                id: '(dari {n} layanan dengan data okupansi langsung)',
                                ru: '(из {n} сервисов с данными о текущей нагрузке)',
                                de: '(von {n} Diensten mit Live-Auslastungsdaten)',
                                zh: '（共 {n} 个班次有实时载客数据）',
                                ja: '（リアルタイム乗車率データのある{n}便のうち）',
                                es: '(de {n} servicios con datos de ocupación en tiempo real)',
                                ko: '(실시간 혼잡도 데이터가 있는 {n}개 노선 중)'
                              },
  'transport.bus.noLoad':           { en: 'No live load data right now — try again in 30 s.', fr: 'Aucune donnée de charge en direct — réessayez dans 30 s.' ,
                           id: 'Saat ini tidak ada data okupansi langsung — coba lagi dalam 30 detik.',
                           ru: 'Данные о текущей нагрузке в данный момент отсутствуют — попробуйте еще раз через 30 секунд.',
                           de: 'Derzeit liegen keine Live-Auslastungsdaten vor – versuchen Sie es in 30 Sekunden erneut.',
                           zh: '目前没有实时载客数据——30 秒后再试。',
                           ja: '現在、リアルタイムの乗車率データはありません。30秒後にもう一度お試しください。',
                           es: 'No hay datos de ocupación en tiempo real en este momento; inténtalo de nuevo en 30 segundos.',
                           ko: '지금은 실시간 혼잡도 데이터가 없습니다. 30초 후에 다시 시도해 주세요.'
                         },
  'transport.bus.routeCaption':     { en: '🗺 Tap below to open Google Maps in transit mode from your saved location. Type your destination in Maps.', fr: '🗺 Touchez ci-dessous pour ouvrir Google Maps en mode transports depuis votre position enregistrée. Tapez votre destination dans Maps.' ,
                                 id: '🗺 Ketuk di bawah untuk membuka Google Maps dalam mode transit dari lokasi yang Anda simpan. Ketik tujuan Anda di Maps.',
                                 ru: '🗺 Нажмите ниже, чтобы открыть Google Maps в режиме движения из сохраненного местоположения. Введите пункт назначения в Карты.',
                                 de: '🗺 Tippen Sie unten, um Google Maps im Transitmodus von Ihrem gespeicherten Standort aus zu öffnen. Geben Sie Ihr Ziel in Maps ein.',
                                 zh: '🗺 点击下方即可从您保存的位置打开谷歌地图的交通模式。在地图中输入您的目的地。',
                                 ja: '🗺 下のボタンをタップして、保存した場所からGoogleマップを移動モードで開きます。マップに目的地を入力してください。',
                                 es: '🗺 Pulsa abajo para abrir Google Maps en modo transporte desde tu ubicación guardada. Escribe tu destino en Maps.',
                                 ko: '🗺 아래를 눌러 저장된 위치에서 대중교통 모드로 구글 지도를 엽니다. 목적지는 지도에서 입력하세요.'
                               },
  'transport.bus.routeBtn':         { en: '🗺 Open Google Maps (transit)', fr: '🗺 Ouvrir Google Maps (transports)' ,
                             id: '🗺 Buka Google Maps (transportasi umum)',
                             ru: '🗺 Откройте Google Maps (транспорт)',
                             de: '🗺 Google Maps öffnen (ÖPNV)',
                             zh: '🗺 打开谷歌地图（公交）',
                             ja: '🗺 Googleマップ（公共交通機関）を開く',
                             es: '🗺 Abre Google Maps (transporte público)',
                             ko: '🗺 구글 지도 열기 (대중교통)'
                           },
  'transport.bus.unreachable':      { en: 'Sorry, the bus feed is unavailable right now.', fr: 'Désolé, le flux des bus est indisponible pour le moment.' ,
                                id: 'Maaf, siaran bus saat ini tidak tersedia.',
                                ru: 'Извините, данные об автобусах сейчас недоступны.',
                                de: 'Leider ist der Bus-Feed momentan nicht verfügbar.',
                                zh: '抱歉，目前公交信息暂不可用。',
                                ja: '申し訳ありませんが、現在バスの運行状況に関する情報はご利用いただけません。',
                                es: 'Lo sentimos, el servicio de datos de autobuses no está disponible en este momento.',
                                ko: '죄송합니다. 지금은 버스 정보를 이용할 수 없습니다.'
                              },

  // /transport incidents
  'transport.incidents.offline':    { en: '🚦 Traffic feed offline (LTA key not configured).', fr: '🚦 Flux de circulation hors-ligne (clé LTA non configurée).' ,
                                  id: '🚦 Umpan lalu lintas offline (kunci LTA belum dikonfigurasi).',
                                  ru: '🚦 Данные о дорожной обстановке недоступны (ключ LTA не настроен).',
                                  de: '🚦 Verkehrsdaten-Feed offline (LTA-Schlüssel nicht konfiguriert).',
                                  zh: '🚦 路况数据离线（LTA 密钥未配置）。',
                                  ja: '🚦 交通情報フィードがオフラインです（LTAキーが設定されていません）。',
                                  es: '🚦 Los datos de tráfico están fuera de línea (la clave LTA no está configurada).',
                                  ko: '🚦 교통 정보가 오프라인 상태입니다 (LTA 키가 설정되지 않았습니다).'
                                },
  'transport.incidents.heading':    { en: '🚦 *Live traffic incidents*', fr: '🚦 *Incidents de circulation en direct*' ,
                                  id: '🚦 *Insiden lalu lintas langsung*',
                                  ru: '🚦 *Информация о дорожно-транспортных происшествиях в режиме реального времени*',
                                  de: '🚦 *Aktuelle Verkehrsmeldungen*',
                                  zh: '🚦 *实时交通事件*',
                                  ja: '🚦 *リアルタイム交通情報*',
                                  es: '🚦 *Incidentes de tráfico en directo*',
                                  ko: '🚦 *실시간 교통 상황*'
                                },
  // v0.60.72 — /causeway live SG ⟷ JB border camera stills.
  'transport.causeway.heading':     { en: '🛂 SG ⟷ JB checkpoint cameras', fr: '🛂 Caméras du poste-frontière SG ⟷ JB' ,
                                 id: '🛂 Kamera pos pemeriksaan SG ⟷ JB',
                                 ru: '🛂 Камеры на КПП SG ⟷ JB',
                                 de: '🛂 SG ⟷ JB Kontrollpunktkameras',
                                 zh: '🛂 新加坡 ⟷ 新山检查站摄像头',
                                 ja: '🛂 シンガポール ⟷ ジョホールバル 検問所カメラ',
                                 es: '🛂 Cámaras de control en SG ⟷ JB',
                                 ko: '🛂 싱가포르 ⟷ 조호르바루 검문소 카메라'
                               },
  'transport.causeway.refreshed':   { en: '_Refreshed: {at}_', fr: '_Actualisé : {at}_' ,
                                   id: '_Diperbarui: {at}_',
                                   ru: '_Обновлено: {at}_',
                                   de: '_Aktualisiert: {at}_',
                                   zh: '_刷新时间：{at}_',
                                   ja: '_更新日時: {at}_',
                                   es: '_Actualizado: {at}_',
                                   ko: '_갱신 시각: {at}_'
                                 },
  // v0.60.103 — live camera count + per-checkpoint breakdown.
  'transport.causeway.count':       { en: '_{n} cameras live ({breakdown})_', fr: '_{n} caméras en direct ({breakdown})_' ,
                               id: '_{n} kamera siaran langsung ({breakdown})_',
                               ru: '_{n} камеры в прямом эфире ({breakdown})_',
                               de: '_{n} Kameras live ({breakdown})_',
                               zh: '_{n} 个摄像头实时在线（{breakdown}）_',
                               ja: '_{n}台のカメラがライブ配信中（{breakdown}）_',
                               es: '_{n} cámaras en directo ({breakdown})_',
                               ko: '_카메라 {n}대 실시간 송출 중 ({breakdown})_'
                             },
  'transport.causeway.empty':       { en: 'LTA returned no checkpoint cameras right now — try again in a minute.',
                                      fr: 'LTA n’a renvoyé aucune caméra de poste-frontière — réessayez dans une minute.' ,
                               id: 'LTA tidak menemukan kamera pos pemeriksaan saat ini — coba lagi dalam satu menit.',
                               ru: 'На данный момент LTA не обнаружила ни одной записи с камер видеонаблюдения — попробуйте еще раз через минуту.',
                               de: 'Die LTA hat im Moment keine Kontrollpunktkameras gemeldet – versuchen Sie es in einer Minute erneut.',
                               zh: 'LTA目前没有返回任何检查站摄像头画面——请稍后再试。',
                               ja: 'LTAは現在、検問所のカメラを返していません。1分後にもう一度お試しください。',
                               es: 'La LTA no ha devuelto ninguna cámara de control en este momento; inténtalo de nuevo en un minuto.',
                               ko: 'LTA가 지금은 검문소 카메라를 제공하지 않습니다. 잠시 후 다시 시도해 주세요.'
                             },
  'transport.causeway.unreachable': { en: '🛂 Couldn’t reach LTA for checkpoint cameras — try again in a minute.',
                                      fr: '🛂 Impossible de joindre LTA pour les caméras de poste-frontière — réessayez dans une minute.' ,
                                     id: '🛂 Tidak dapat terhubung dengan LTA untuk kamera pos pemeriksaan — coba lagi dalam satu menit.',
                                     ru: '🛂 Не удалось связаться с LTA по поводу камер на контрольно-пропускных пунктах — попробуйте еще раз через минуту.',
                                     de: '🛂 LTA konnte bezüglich der Kontrollpunktkameras nicht erreicht werden – bitte versuchen Sie es in einer Minute erneut.',
                                     zh: '🛂 无法联系陆路交通管理局获取检查站摄像头信息——请稍后再试。',
                                     ja: '🛂 チェックポイントカメラについてLTAに接続できませんでした。1分後にもう一度お試しください。',
                                     es: '🛂 No se pudo contactar con LTA para obtener las cámaras de control; inténtalo de nuevo en un minuto.',
                                     ko: '🛂 검문소 카메라를 위해 LTA에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
                                   },
  'transport.incidents.none':       { en: 'No live incidents reported.', fr: 'Aucun incident en direct signalé.' ,
                               id: 'Tidak ada insiden langsung yang dilaporkan.',
                               ru: 'Сообщений о происшествиях в режиме реального времени не поступало.',
                               de: 'Es wurden keine aktuellen Vorfälle gemeldet.',
                               zh: '暂无实时路况事件报告。',
                               ja: '現在発生中の交通障害の報告はありません。',
                               es: 'No se han registrado incidentes activos.',
                               ko: '보고된 실시간 교통 상황이 없습니다.'
                             },
  // v0.60.103 — uncapped: show every island-wide incident, sorted
  // nearest-first when location is shared.
  'transport.incidents.nearHeader': { en: 'Latest {n} traffic incidents island-wide:', fr: 'Derniers {n} incidents de circulation à l’échelle de l’île :' ,
                                     id: '{n} insiden lalu lintas terbaru di seluruh pulau:',
                                     ru: 'Последние {n} дорожных происшествий по всему острову:',
                                     de: 'Aktuelle {n} Verkehrsvorfälle inselweit:',
                                     zh: '全岛最新{n}起交通事故：',
                                     ja: '島内で最新の交通障害{n}件：',
                                     es: 'Últimos {n} incidentes de tráfico en toda la isla:',
                                     ko: '싱가포르 전역의 최근 교통 상황 {n}건:'
                                   },
  'transport.incidents.row':        { en: '· {type}{dist}', fr: '· {type}{dist}' ,
                              id: '· {type}{dist}',
                              ru: '· {type}{dist}',
                              de: '· {type}{dist}',
                              zh: '· {type}{dist}',
                              ja: '・{type}{dist}',
                              es: '· {type}{dist}',
                              ko: '· {type}{dist}'
                            },
  'transport.incidents.noNear':     { en: '{total} incidents island-wide; none within 20 km of your location.', fr: '{total} incidents dans tout le pays ; aucun à moins de 20 km de votre position.' ,
                                 id: '{total} insiden di seluruh pulau; tidak ada dalam radius 20 km dari lokasi Anda.',
                                 ru: '{total} инцидентов по всему острову; ни одного в радиусе 20 км от вашего местоположения.',
                                 de: '{total} Vorfälle inselweit; keiner im Umkreis von 20 km um Ihren Standort.',
                                 zh: '全岛共发生{total}起事件；您所在位置 20 公里范围内没有发生事件。',
                                 ja: '島内で{total}件の交通障害。現在地から20km圏内では発生していません。',
                                 es: '{total} incidentes en toda la isla; ninguno en un radio de 20 km de tu ubicación.',
                                 ko: '싱가포르 전역에 {total}건이 있으며, 현재 위치에서 20km 이내에는 없습니다.'
                               },
  'transport.incidents.noLoc':      { en: '{total} incidents island-wide. Share your location for nearest-first sorting.', fr: '{total} incidents dans tout le pays. Partagez votre position pour un tri par proximité.' ,
                                id: '{total} insiden di seluruh pulau. Bagikan lokasi Anda untuk pengurutan terdekat terlebih dahulu.',
                                ru: '{total} инцидентов по всему острову. Укажите местоположение, чтобы отсортировать по близости.',
                                de: '{total} Vorfälle inselweit. Teilen Sie Ihren Standort, damit die Ergebnisse nach Nähe sortiert werden können.',
                                zh: '全岛共发生{total}起事件。请分享您的位置，以便我们优先显示距离最近的事件。',
                                ja: '島内で{total}件の交通障害。現在地を共有していただくと、最寄りのものを優先的に表示します。',
                                es: '{total} incidentes en toda la isla. Comparte tu ubicación para ordenarlos por proximidad.',
                                ko: '싱가포르 전역에 {total}건이 있습니다. 위치를 공유하시면 가까운 순으로 정렬해 드립니다.'
                              },
  'transport.incidents.unreachable':{ en: 'Sorry, the traffic feed failed.', fr: 'Désolé, le flux de circulation a échoué.' ,
                                      id: 'Maaf, umpan lalu lintas mengalami kegagalan.',
                                      ru: 'Извините, передача данных о дорожной ситуации не удалась.',
                                      de: 'Leider ist der Verkehrsdaten-Feed ausgefallen.',
                                      zh: '抱歉，交通信息流传输失败。',
                                      ja: '申し訳ありませんが、交通情報フィードの取得に失敗しました。',
                                      es: 'Lo sentimos, no se han podido obtener los datos de tráfico.',
                                      ko: '죄송합니다. 교통 정보를 가져오지 못했습니다.'
                                    },

  // /transport drive
  'transport.drive.title':          { en: '🚗 Drive', fr: '🚗 Voiture' ,
                            id: '🚗 Mengemudi',
                            ru: '🚗 Вождение',
                            de: '🚗 Fahren',
                            zh: '🚗 驾车',
                            ja: '🚗 ドライブ',
                            es: '🚗 Conducir',
                            ko: '🚗 운전'
                          },
  'transport.drive.trafficNear':    { en: '🚦 Traffic (top {n} of {total} island-wide):', fr: '🚦 Circulation (top {n} sur {total} dans tout le pays) :' ,
                                  id: '🚦 Lalu lintas ({n} teratas dari {total} di seluruh pulau):',
                                  ru: '🚦 Дорожная обстановка (топ-{n} из {total} по всему острову):',
                                  de: '🚦 Verkehr (Top {n} von {total} inselweit):',
                                  zh: '🚦 路况（全岛 {total} 起中的前 {n} 起）：',
                                  ja: '🚦 交通障害（島内{total}件のうち上位{n}件）：',
                                  es: '🚦 Tráfico (los {n} principales de {total} en toda la isla):',
                                  ko: '🚦 교통 상황 (싱가포르 전역 {total}건 중 상위 {n}건):'
                                },
  'transport.drive.trafficNoNear':  { en: '🚦 Traffic: {total} incidents island-wide; none within 5 km.', fr: '🚦 Circulation : {total} incidents dans tout le pays ; aucun à moins de 5 km.' ,
                                    id: '🚦 Lalu lintas: {total} insiden di seluruh pulau; tidak ada dalam radius 5 km.',
                                    ru: '🚦 Дорожная ситуация: {total} инцидентов по всему острову; ни одного в радиусе 5 км.',
                                    de: '🚦 Verkehr: {total} Vorfälle inselweit; keine im Umkreis von 5 km.',
                                    zh: '🚦 路况：全岛共 {total} 起事件；5 公里范围内无事件。',
                                    ja: '🚦 交通障害：島内{total}件。5km圏内はなし。',
                                    es: '🚦 Tráfico: {total} incidentes en toda la isla; ninguno en un radio de 5 km.',
                                    ko: '🚦 교통 상황: 싱가포르 전역에 {total}건이 있으며, 5km 이내에는 없습니다.'
                                  },
  'transport.drive.trafficNone':    { en: '🚦 Traffic: no live incidents reported.', fr: '🚦 Circulation : aucun incident en direct signalé.' ,
                                  id: '🚦 Lalu lintas: tidak ada insiden langsung yang dilaporkan.',
                                  ru: '🚦 Дорожная обстановка: происшествий не зарегистрировано.',
                                  de: '🚦 Verkehr: Keine aktuellen Vorfälle gemeldet.',
                                  zh: '🚦 路况：暂无实时事件报告。',
                                  ja: '🚦 交通障害：現在発生中の報告はありません。',
                                  es: '🚦 Tráfico: no se han registrado incidentes activos.',
                                  ko: '🚦 교통 상황: 보고된 실시간 상황이 없습니다.'
                                },
  'transport.drive.openMapsBtn':    { en: 'Google Map ↗', fr: 'Google Map ↗' ,
                                  id: 'Google Maps ↗',
                                  ru: 'Google Maps ↗',
                                  de: 'Google Maps ↗',
                                  zh: '谷歌地图 ↗',
                                  ja: 'Googleマップ ↗',
                                  es: 'Google Maps ↗',
                                  ko: '구글 지도 ↗'
                                },
  'transport.drive.noLocation':     { en: 'Share your location once and Soleat will offer a one-tap driving directions link.', fr: 'Partagez votre position une fois et Soleat proposera un lien d’itinéraire en voiture en un clic.' ,
                                 id: 'Bagikan lokasi Anda sekali saja dan Soleat akan menawarkan tautan petunjuk arah berkendara hanya dengan sekali klik.',
                                 ru: 'Укажите свое местоположение один раз, и Soleat предложит вам ссылку для построения маршрута одним касанием.',
                                 de: 'Teilen Sie Ihren Standort einmal mit, und Soleat bietet Ihnen einen Link zur Wegbeschreibung mit nur einem Klick.',
                                 zh: '只需分享一次您的位置，Soleat 就会提供一键式驾车路线链接。',
                                 ja: '一度位置情報を共有すれば、Soleatはワンタップでアクセスできる運転ルート案内リンクを提供します。',
                                 es: 'Comparte tu ubicación una sola vez y Soleat te ofrecerá un enlace con indicaciones para llegar en coche con un solo toque.',
                                 ko: '위치를 한 번만 공유해 주시면 Soleat이 한 번의 탭으로 열리는 길찾기 링크를 제공합니다.'
                               },
  'transport.drive.btn.carpark':    { en: '🅿️ Carpark', fr: '🅿️ Parking' ,
                                  id: '🅿️ Parkir Mobil',
                                  ru: '🅿️ Парковка',
                                  de: '🅿️ Parkplatz',
                                  zh: '🅿️ 停车场',
                                  ja: '🅿️ 駐車場',
                                  es: '🅿️ Aparcamiento',
                                  ko: '🅿️ 주차장'
                                },
  'transport.drive.unreachable':    { en: 'Sorry, the drive view failed.', fr: 'Désolé, la vue voiture a échoué.' ,
                                  id: 'Maaf, tampilan mengemudi gagal dimuat.',
                                  ru: 'Извините, не удалось загрузить раздел «Вождение».',
                                  de: 'Die Fahransicht konnte leider nicht geladen werden.',
                                  zh: '抱歉，驾车信息加载失败。',
                                  ja: '申し訳ありませんが、ドライブ情報の取得に失敗しました。',
                                  es: 'Lo sentimos, no se ha podido cargar la vista de conducción.',
                                  ko: '죄송합니다. 운전 화면을 불러오지 못했습니다.'
                                },

  // /forgetme
  'forgetme.nothing':          { en: '✅ Nothing to erase — I had no stored data for you. (Caches and request rows expire automatically; the persistent slots all came up empty.)', fr: '✅ Rien à effacer — je n’avais aucune donnée enregistrée pour vous. (Les caches et lignes de requête expirent automatiquement ; les emplacements persistants étaient tous vides.)' ,
                       id: '✅ Tidak ada yang perlu dihapus — Saya tidak memiliki data yang tersimpan untuk Anda. (Cache dan baris permintaan akan kedaluwarsa secara otomatis; semua slot persisten kosong.)',
                       ru: '✅ Удалять нечего — у меня не было сохраненных данных о вас. (Кэш и строки запросов автоматически удаляются; все постоянные слоты оказались пустыми.)',
                       de: '✅ Nichts zu löschen – ich hatte keine gespeicherten Daten für Sie. (Caches und Anforderungszeilen laufen automatisch ab; die persistenten Speicherplätze waren alle leer.)',
                       zh: '✅ 无需删除任何数据——我没有存储任何关于您的数据。（缓存和请求行会自动过期；持久化存储槽均为空。）',
                       ja: '✅ 消去するものはありません — お客様のために保存されたデータはありませんでした。（キャッシュとリクエスト行は自動的に期限切れになります。永続スロットはすべて空でした。）',
                       es: '✅ No hay nada que borrar: no tenía datos almacenados sobre ti. (Las cachés y las filas de solicitudes caducan automáticamente; todos los espacios persistentes estaban vacíos).',
                       ko: '✅ 삭제할 것이 없습니다 — 저장된 데이터가 없었습니다. (캐시와 요청 기록은 자동으로 만료되며, 영구 저장 항목은 모두 비어 있었습니다.)'
                     },
  'forgetme.eraseHeader':      { en: '✅ Erased *{n}* Redis entry for your chat.', fr: '✅ {n} entrée Redis effacée pour votre conversation.' ,
                           id: '✅ Entri Redis *{n}* dihapus untuk obrolan Anda.',
                           ru: '✅ Удалена *{n}* запись Redis для вашего чата.',
                           de: '✅ *{n}* Redis-Eintrag für Ihren Chat gelöscht.',
                           zh: '✅ 已删除您聊天的 *{n}* 条 Redis 记录。',
                           ja: '✅ チャットの Redis エントリを *{n}* 件削除しました。',
                           es: '✅ Se borró *{n}* entrada de Redis de tu chat.',
                           ko: '✅ 이 대화의 Redis 항목 *{n}*건을 삭제했습니다.'
                         },
  'forgetme.eraseHeaderMany':  { en: '✅ Erased *{n}* Redis entries for your chat.', fr: '✅ {n} entrées Redis effacées pour votre conversation.' ,
                               id: '✅ Entri Redis *{n}* dihapus untuk obrolan Anda.',
                               ru: '✅ Удалено *{n}* записей Redis для вашего чата.',
                               de: '✅ *{n}* Redis-Einträge für Ihren Chat gelöscht.',
                               zh: '✅ 已删除您聊天的 *{n}* 条 Redis 记录。',
                               ja: '✅ チャットの Redis エントリを *{n}* 件削除しました。',
                               es: '✅ Se borraron *{n}* entradas de Redis de tu chat.',
                               ko: '✅ 이 대화의 Redis 항목 *{n}*건을 삭제했습니다.'
                             },
  'forgetme.wiped':            { en: 'Wiped:', fr: 'Effacé :' ,
                     id: 'Dihapus:',
                     ru: 'Удалено:',
                     de: 'Gelöscht:',
                     zh: '已擦除：',
                     ja: '消去済み:',
                     es: 'Borrado:',
                     ko: '삭제된 항목:'
                   },
  'forgetme.andMore':          { en: '…and {n} more', fr: '…et {n} autres' ,
                       id: '…dan {n} lainnya',
                       ru: '…и {n} ещё',
                       de: '…und {n} weitere',
                       zh: '……以及另外 {n} 条',
                       ja: '…ほか{n}件',
                       es: '…y {n} más',
                       ko: '…외 {n}건'
                     },
  'forgetme.followup':         { en: 'Send any command to start fresh. Recent picks and your last shared location are gone.', fr: 'Envoyez n’importe quelle commande pour repartir à neuf. Vos choix récents et votre dernière position partagée ont été effacés.' ,
                        id: 'Kirim perintah apa pun untuk memulai dari awal. Pilihan terbaru dan lokasi terakhir yang Anda bagikan sudah hilang.',
                        ru: 'Отправьте любую команду, чтобы начать заново. Недавние подборки и последнее местоположение, которым вы делились, удалены.',
                        de: 'Senden Sie einen beliebigen Befehl, um von vorne zu beginnen. Ihre letzten Auswahlen und Ihr zuletzt geteilter Standort sind gelöscht.',
                        zh: '发送任意命令即可重新开始。最近的选择和上次分享的位置都已清除。',
                        ja: '最初からやり直すには、任意のコマンドを送信してください。最近のおすすめと最後に共有した場所は削除済みです。',
                        es: 'Envía cualquier comando para empezar de cero. Tus selecciones recientes y tu última ubicación compartida se han eliminado.',
                        ko: '아무 명령이나 보내시면 새로 시작합니다. 최근 선택 항목과 마지막으로 공유한 위치는 삭제되었습니다.'
                      },
  'forgetme.error':            { en: 'Sorry, /forgetme hit an error. Try again in a moment, or DM the operator.', fr: 'Désolé, /forgetme a rencontré une erreur. Réessayez dans un instant, ou contactez l’opérateur.' ,
                     id: 'Maaf, /forgetme mengalami kesalahan. Coba lagi sebentar lagi, atau kirim pesan pribadi ke operator.',
                     ru: 'Извините, команда /forgetme выдала ошибку. Попробуйте еще раз через минуту или напишите оператору в личные сообщения.',
                     de: 'Entschuldigung, /forgetme ist auf einen Fehler gestoßen. Versuchen Sie es gleich erneut oder kontaktieren Sie den Betreiber per Direktnachricht.',
                     es: 'Lo sentimos, /forgetme ha dado un error. Inténtalo de nuevo en un momento o envía un mensaje directo al operador.'
                   ,
                     zh: '抱歉，/forgetme 出错了。请稍后再试，或私信运营者。',
                     ja: '申し訳ありません、/forgetme でエラーが発生しました。しばらくしてからもう一度お試しいただくか、オペレーターにDMを送ってください。',
                     ko: '죄송합니다. /forgetme 실행 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 운영자에게 문의해 주세요.'
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
                                  es: '✅ Preferencia borrada. Soleat seguirá el idioma de tu Telegram.',
                                  ko: '✅ 설정을 초기화했습니다. Soleat은 텔레그램 언어를 따릅니다.'
                                  },
  'language.current':          { en: '🌐 Current language: English{fromTg}.\nChoose a language:',
                                  fr: '🌐 Langue actuelle : Français{fromTg}.\nChoisissez une langue :',
                                  id: '🌐 Bahasa saat ini: Bahasa Indonesia{fromTg}.\nPilih bahasa:',
                                  ru: '🌐 Текущий язык: Русский{fromTg}.\nВыберите язык:',
                                  de: '🌐 Aktuelle Sprache: Deutsch{fromTg}.\nSprache wählen:',
                                  zh: '🌐 当前语言：中文{fromTg}。\n选择语言：',
                                  ja: '🌐 現在の言語：日本語{fromTg}。\n言語を選択：',
                                  es: '🌐 Idioma actual: Español{fromTg}.\nElige un idioma:',
                                  ko: '🌐 현재 언어: 한국어{fromTg}.\n언어를 선택하세요:'
                                  },
  'language.fromTg':           { en: ' (from your Telegram)',
                                  fr: ' (depuis votre Telegram)',
                                  id: ' (dari Telegram Anda)',
                                  ru: ' (из вашего Telegram)',
                                  de: ' (von Ihrem Telegram)',
                                  zh: '（来自您的 Telegram）',
                                  ja: '（Telegramより）',
                                  es: ' (de tu Telegram)',
                                  ko: ' (텔레그램 설정 기준)'
                                  },
  'language.btn.en':           { en: '🇬🇧 English', fr: '🇬🇧 English', ko: '🇬🇧 English' },
  'language.btn.fr':           { en: '🇫🇷 Français', fr: '🇫🇷 Français', ko: '🇫🇷 Français' },
  // v0.62.480 — flag + endonym (native name) so a speaker recognises their
  // own language whatever the prompt locale. Same string in both en/fr keys.
  'language.btn.id':           { en: '🇮🇩 Indonesia', fr: '🇮🇩 Indonesia', ko: '🇮🇩 Indonesia' },
  'language.btn.ru':           { en: '🇷🇺 Русский', fr: '🇷🇺 Русский', ko: '🇷🇺 Русский' },
  'language.btn.de':           { en: '🇩🇪 Deutsch', fr: '🇩🇪 Deutsch', ko: '🇩🇪 Deutsch' },
  'language.btn.zh':           { en: '🇨🇳 中文', fr: '🇨🇳 中文', ko: '🇨🇳 中文' },
  'language.btn.ja':           { en: '🇯🇵 日本語', fr: '🇯🇵 日本語', ko: '🇯🇵 日本語' },
  'language.btn.es':           { en: '🇪🇸 Español', fr: '🇪🇸 Español', ko: '🇪🇸 Español' },
  'language.btn.ko':           { en: '🇰🇷 한국어', fr: '🇰🇷 한국어', ko: '🇰🇷 한국어' },

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
    en: 'Hungry for something beyond the usual? Soleat — “Solo eats” / “So let’s eat” — helps you explore Singapore’s {cuisines} cuisine melting pot — and other cities — with {cuisine-venues} curated venues, hawkers, Michelin Star picks, Bib Gourmand favourites under S$45, weather, and transport in one Telegram guide. Start with /c /cuisine or /m /menu\n\n/cuisine   — full Cuisine Picker (over {cuisines} cuisines, {cuisine-venues} curated venues, SG, Johor Bahru + other cities, 6 quick filters)\n/hawker    — >{hawker} hawker centres (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table\n/l /location — share or set your current location\n/weather   — now + 2-hour NEA forecast\n/transport — bus, MRT, walk, drive\n/carpark   — nearest 5 with available lots\n/language  — app language · 9 options (chat stays EN/FR)\n/privacy   — data, retention & sources\n/legal     — disclaimer & jurisdiction notes\n/forgetme  — erase your stored data\n\nOr tap the menu button (🍴 Cuisine Picker) to jump straight in.',
    fr: 'Envie de sortir des plats habituels ? Soleat — « Solo eats » / « So let’s eat » — vous aide à explorer plus de {cuisines} cuisines à Singapour — et d’autres villes — avec {cuisine-venues} adresses sélectionnées, hawkers, adresses Michelin, Bib Gourmand à moins de 45 S$, météo et transport dans Telegram. Commencez avec /c /cuisine ou /m /menu\n\n/cuisine   — Sélecteur Cuisine complet (plus de {cuisines} cuisines, {cuisine-venues} adresses sélectionnées, SG, Johor Bahru + autres villes, 6 filtres rapides)\n/hawker    — plus de {hawker} centres hawkers (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Producteurs locaux\n/l /location — partager ou définir votre position actuelle\n/weather   — maintenant + prévisions 2 h NEA\n/transport — bus, MRT, marche, voiture\n/carpark   — 5 parkings proches avec places\n/language  — langue de l’app · 9 options (chat en FR/EN)\n/privacy   — données, conservation et sources\n/legal     — clauses et juridiction\n/forgetme  — effacer vos données enregistrées\n\nOu touchez le bouton menu (🍴 Sélecteur Cuisine) pour démarrer directement.',
    id: 'Ingin sesuatu di luar yang biasa? Soleat — “Solo eats” / “So let’s eat” — membantu Anda menjelajahi peleburan {cuisines} masakan Singapura — dan kota lain — dengan {cuisine-venues} tempat pilihan, hawker, rekomendasi Michelin Star, favorit Bib Gourmand di bawah S$45, cuaca, dan transportasi dalam satu panduan Telegram. Mulai dengan /c /cuisine atau /m /menu\n\n/cuisine — Cuisine Picker lengkap (lebih dari {cuisines} masakan, {cuisine-venues} tempat pilihan, SG, Johor Bahru + kota lain, 6 filter cepat)\n/hawker — >{hawker} pusat jajanan (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, Produk Lokal ke Meja\n/l /location — bagikan atau atur lokasi Anda saat ini\n/weather — sekarang + prakiraan NEA 2 jam\n/transport — bus, MRT, jalan kaki, berkendara\n/carpark — 5 terdekat dengan slot kosong\n/language — bahasa aplikasi · 9 pilihan (obrolan tetap EN/FR)\n/privacy — data, retensi & sumber\n/legal — penafian & catatan yurisdiksi\n/forgetme — hapus data tersimpan Anda\n\nAtau ketuk tombol menu (🍴 Cuisine Picker) untuk langsung mulai.',
    ru: 'Хочется чего-то за пределами привычного? Soleat — «Solo eats» / «So let’s eat» — помогает исследовать кулинарный плавильный котёл Сингапура из {cuisines} кухонь — и другие города — с {cuisine-venues} отобранными заведениями, хокерами, местами со звездой Michelin, фаворитами Bib Gourmand дешевле S$45, погодой и транспортом в одном гиде Telegram. Начните с /c /cuisine или /m /menu\n\n/cuisine — полный Cuisine Picker (более {cuisines} кухонь, {cuisine-venues} отобранных заведений, SG, Джохор-Бару и другие города, 6 быстрых фильтров)\n/hawker — >{hawker} хокер-центров (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, местные продукты\n/l /location — поделиться или задать текущее местоположение\n/weather — сейчас + прогноз NEA на 2 часа\n/transport — автобус, MRT, пешком, за рулём\n/carpark — 5 ближайших парковок со свободными местами\n/language — язык приложения · 9 вариантов (чат остаётся EN/FR)\n/privacy — данные, хранение и источники\n/legal — оговорки и юрисдикция\n/forgetme — удалить сохранённые данные\n\nИли нажмите кнопку меню (🍴 Cuisine Picker), чтобы начать сразу.',
    de: 'Lust auf etwas jenseits des Üblichen? Soleat — „Solo eats“ / „So let’s eat“ — hilft Ihnen, Singapurs Schmelztiegel aus {cuisines} Küchen zu erkunden — und andere Städte — mit {cuisine-venues} kuratierten Adressen, Hawkern, Michelin-Stern-Tipps, Bib-Gourmand-Favoriten unter S$45, Wetter und Verkehr in einem Telegram-Guide. Starten Sie mit /c /cuisine oder /m /menu\n\n/cuisine — vollständiger Cuisine Picker (über {cuisines} Küchen, {cuisine-venues} kuratierte Adressen, SG, Johor Bahru + weitere Städte, 6 Schnellfilter)\n/hawker — >{hawker} Hawker-Zentren (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, regionale Produkte\n/l /location — Standort teilen oder festlegen\n/weather — jetzt + 2-Stunden-Prognose der NEA\n/transport — Bus, MRT, zu Fuß, Auto\n/carpark — die 5 nächsten mit freien Plätzen\n/language — App-Sprache · 9 Optionen (Chat bleibt EN/FR)\n/privacy — Daten, Speicherdauer & Quellen\n/legal — Haftungsausschluss & Gerichtsstand\n/forgetme — gespeicherte Daten löschen\n\nOder tippen Sie auf die Menü-Schaltfläche (🍴 Cuisine Picker), um direkt loszulegen.',
    zh: '想吃点不一样的？Soleat —— “Solo eats” / “So let’s eat” —— 带您探索新加坡 {cuisines} 种菜系交融的美食版图，以及其他城市，收录 {cuisine-venues} 家精选餐馆、小贩中心、米其林星级推荐、45 新元以下的必比登推介，还有天气与交通，全在一个 Telegram 指南里。从 /c /cuisine 或 /m /menu 开始\n\n/cuisine — 完整的 Cuisine Picker（超过 {cuisines} 种菜系、{cuisine-venues} 家精选餐馆，新加坡、新山及其他城市，6 个快捷筛选）\n/hawker — >{hawker} 家小贩中心（2025）\n/recognised — 米其林、必比登推介、亚洲 50/100 佳、本地食材上桌\n/l /location — 分享或设置您当前的位置\n/weather — 当前天气 + NEA 未来 2 小时预报\n/transport — 公交、地铁、步行、驾车\n/carpark — 最近的 5 个有空位的停车场\n/language — 应用语言 · 9 种选择（聊天仍为 EN/FR）\n/privacy — 数据、保存期限与来源\n/legal — 免责声明与司法管辖说明\n/forgetme — 删除您已保存的数据\n\n或点击菜单按钮（🍴 Cuisine Picker）直接开始。',
    ja: 'いつもと違うものを食べたいですか？Soleat ——「Solo eats」/「So let’s eat」—— は、シンガポールの {cuisines} 種類の料理が交わる食の坩堝、そして他都市を、{cuisine-venues} 軒の厳選店、ホーカー、ミシュラン星付き、S$45 以下のビブグルマン、天気、交通とともに 1 つの Telegram ガイドで案内します。/c /cuisine または /m /menu から始めましょう\n\n/cuisine — フル機能の Cuisine Picker（{cuisines} 種類以上の料理、{cuisine-venues} 軒の厳選店、シンガポール、ジョホールバル＋他都市、6 つのクイックフィルター）\n/hawker — >{hawker} 軒のホーカーセンター（2025）\n/recognised — ミシュラン、ビブグルマン、アジア 50/100、地元産食材\n/l /location — 現在地を共有または設定\n/weather — 現在 + NEA の 2 時間予報\n/transport — バス、MRT、徒歩、車\n/carpark — 空きのある最寄り 5 か所\n/language — アプリの言語 · 9 種類（チャットは EN/FR のまま）\n/privacy — データ、保存期間、出典\n/legal — 免責事項と管轄について\n/forgetme — 保存データを削除\n\nまたはメニューボタン（🍴 Cuisine Picker）をタップしてすぐに始められます。',
    es: '¿Te apetece algo más allá de lo habitual? Soleat — «Solo eats» / «So let’s eat» — te ayuda a explorar el crisol de {cuisines} cocinas de Singapur — y otras ciudades — con {cuisine-venues} locales seleccionados, hawkers, recomendaciones con estrella Michelin, favoritos Bib Gourmand por menos de S$45, el tiempo y el transporte en una sola guía de Telegram. Empieza con /c /cuisine o /m /menu\n\n/cuisine — Cuisine Picker completo (más de {cuisines} cocinas, {cuisine-venues} locales seleccionados, SG, Johor Bahru + otras ciudades, 6 filtros rápidos)\n/hawker — >{hawker} centros de comida callejera (2025)\n/recognised — Michelin, Bib Gourmand, Asia 50/100, producto local en mesa\n/l /location — comparte o fija tu ubicación actual\n/weather — ahora + previsión NEA a 2 horas\n/transport — autobús, MRT, a pie, en coche\n/carpark — los 5 más cercanos con plazas libres\n/language — idioma de la app · 9 opciones (el chat sigue en EN/FR)\n/privacy — datos, conservación y fuentes\n/legal — aviso legal y jurisdicción\n/forgetme — borra tus datos guardados\n\nO toca el botón de menú (🍴 Cuisine Picker) para empezar directamente.',
    ko: '평소와 다른 것이 먹고 싶으신가요? Soleat —— “Solo eats” / “So let’s eat” —— 은 싱가포르의 {cuisines}개 요리가 어우러진 미식의 용광로와 다른 도시들을, 엄선한 {cuisine-venues}곳의 식당, 호커, 미슐랭 스타, S$45 이하의 빕구르망, 날씨, 교통 정보와 함께 하나의 텔레그램 가이드로 안내합니다. /c /cuisine 또는 /m /menu 로 시작하세요\n\n/cuisine   — 전체 Cuisine Picker ({cuisines}개 이상의 요리, 엄선한 {cuisine-venues}곳, 싱가포르, 조호르바루 및 기타 도시, 빠른 필터 6종)\n/hawker    — 호커센터 {hawker}곳 이상 (2025)\n/recognised — 미슐랭, 빕구르망, 아시아 50/100, 로컬 식재료\n/l /location — 현재 위치 공유 또는 설정\n/weather   — 현재 날씨 + NEA 2시간 예보\n/transport — 버스, MRT, 도보, 운전\n/carpark   — 빈자리가 있는 가장 가까운 5곳\n/language  — 앱 언어 · 9개 (채팅은 EN/FR 유지)\n/privacy   — 데이터, 보관 기간, 출처\n/legal     — 면책 조항 및 관할 안내\n/forgetme  — 저장된 데이터 삭제\n\n또는 메뉴 버튼(🍴 Cuisine Picker)을 눌러 바로 시작하세요.'
  },

  // location flow
  'location.shareTap':         { en: '📍 Tap to share your current location.', fr: '📍 Touchez pour partager votre position actuelle.' ,
                        id: '📍 Ketuk untuk membagikan lokasi Anda saat ini.',
                        ru: '📍 Нажмите, чтобы поделиться своим текущим местоположением.',
                        de: '📍 Tippen Sie hier, um Ihren aktuellen Standort zu teilen.',
                        zh: '📍点击分享您的当前位置。',
                        ja: '📍 現在地を共有するにはタップしてください。',
                        es: '📍 Toca para compartir tu ubicación actual.',
                        ko: '📍 눌러서 현재 위치를 공유하세요.'
                      },
  'location.got':              { en: '📍 Got your location.', fr: '📍 Position reçue.' ,
                   id: '📍 Lokasi Anda sudah diketahui.',
                   ru: '📍 Ваше местоположение определено.',
                   de: '📍 Wir haben Ihren Standort ermittelt.',
                   zh: '📍已获取您的位置。',
                   ja: '📍 現在地を取得しました。',
                   es: '📍 Tenemos tu ubicación.',
                   ko: '📍 위치를 받았습니다.'
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
                             es: '📍 *Ubicación establecida en:*\n{place}\n\n💻 En la versión de escritorio, Telegram comparte un *punto marcado en el mapa*, no un GPS en tiempo real; puede ubicarse en un lugar incorrecto. ¿Es aquí donde estás?',
                             ko: '📍 *설정된 위치:*\n{place}\n\n💻 데스크톱에서는 텔레그램이 실시간 GPS가 아니라 *지도에서 찍은 지점*을 공유하므로 엉뚱한 곳이 될 수 있습니다. 지금 계신 곳이 맞나요?'
                           },
  'loc.confirm.yes':           { en: '✅ Yes, use it', fr: '✅ Oui, utiliser' ,
                      id: '✅ Ya, gunakanlah',
                      ru: '✅ Да, использовать',
                      de: '✅ Ja, verwenden',
                      zh: '✅ 是的，请使用它',
                      ja: '✅ はい、これを使う',
                      es: '✅ Sí, úsalo',
                      ko: '✅ 네, 사용할게요'
                    },
  'loc.confirm.no':            { en: '✏️ No, set manually', fr: '✏️ Non, saisir manuellement' ,
                     id: '✏️ Tidak, atur secara manual',
                     ru: '✏️ Нет, установить вручную',
                     de: '✏️ Nein, manuell einstellen',
                     zh: '✏️ 不，手动设置',
                     ja: '✏️ いいえ、手動で設定',
                     es: '✏️ No, configurar manualmente',
                     ko: '✏️ 아니요, 직접 설정할게요'
                   },
  'loc.confirm.okAck':         { en: '📍 *Confirmed:* {place}', fr: '📍 *Confirmé :* {place}' ,
                        id: '📍 *Dikonfirmasi:* {place}',
                        ru: '📍 *Подтверждено:* {place}',
                        de: '📍 *Bestätigt:* {place}',
                        zh: '📍 *已确认：* {place}',
                        ja: '📍 *確認済み:* {place}',
                        es: '📍 *Confirmado:* {place}',
                        ko: '📍 *확인됨:* {place}'
                      },
  'loc.confirm.fixPrompt':     { en: 'Type your area — e.g. `/l Orchard Road` or `/l Bugis`. On desktop, typing is more reliable than the share button.',
                                 fr: 'Saisissez votre lieu — p. ex. `/l Orchard Road` ou `/l Bugis`. Sur ordinateur, taper est plus fiable que le bouton de partage.' ,
                            id: 'Ketik area Anda — misalnya `/l Orchard Road` atau `/l Bugis`. Di desktop, mengetik lebih andal daripada tombol berbagi.',
                            ru: 'Введите название вашего района — например `/l Orchard Road` или `/l Bugis`. На компьютере ввод текста более надежен, чем использование кнопки «Поделиться».',
                            de: 'Geben Sie Ihren Ort ein – z. B. `/l Orchard Road` oder `/l Bugis`. Auf dem Desktop ist die Eingabe zuverlässiger als die Teilen-Schaltfläche.',
                            zh: '输入您的区域，例如`/l Orchard Road`或`/l Bugis`。在电脑上，打字比使用分享按钮更可靠。',
                            ja: '地域名を入力してください（例：`/l Orchard Road`または`/l Bugis`）。デスクトップでは、共有ボタンよりも入力の方が確実です。',
                            es: 'Escribe tu zona; por ejemplo `/l Orchard Road` o `/l Bugis`. En ordenadores de sobremesa, escribir es más fiable que usar el botón de compartir.',
                            ko: '계신 지역을 입력하세요 — 예: `/l Orchard Road` 또는 `/l Bugis`. 데스크톱에서는 공유 버튼보다 직접 입력이 더 정확합니다.'
                          },
  'loc.desktopNudge':          {
    en: '💻 On desktop? Telegram shares a map-pick, not GPS. If this is wrong, type /l <your area>.',
    fr: '💻 Sur ordinateur ? Telegram partage un point sur carte, pas le GPS. Si c’est faux, tapez /l <votre lieu>.',
    id: '💻 Di desktop? Telegram membagikan titik peta, bukan GPS. Kalau ini salah, ketik /l <your area>.',
    ru: '💻 На компьютере? Telegram делится точкой на карте, а не GPS. Если это неверно, введите /l <your area>.',
    de: '💻 Auf dem Desktop? Telegram teilt eine Kartenposition, nicht GPS. Falls das falsch ist, gib /l <your area> ein.',
    zh: '💻 在电脑上？Telegram 分享的是地图上的点，不是 GPS。如果不对，请输入 /l <your area>。',
    ja: '💻 デスクトップですか？Telegram が共有するのは地図上の地点で、GPS ではありません。違う場合は /l <your area> と入力してください。',
    es: '💻 ¿En ordenador? Telegram comparte un punto del mapa, no el GPS. Si no es correcto, escribe /l <your area>.',
    ko: '💻 데스크톱을 쓰고 계신가요? 텔레그램은 GPS가 아니라 지도에서 찍은 지점을 공유합니다. 위치가 틀렸다면 /l <지역명> 을 입력하세요.'
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
    es: '📍 Comparte tu ubicación una vez para que {label} use tu región (o escribe `/location <place name>` para fijarla manualmente).',
    ko: '📍 위치를 한 번만 공유하시면 {label}이(가) 해당 지역 기준으로 동작합니다 (또는 `/location <장소명>` 을 입력해 직접 설정하세요).'
  },
  'location.current':          { en: '📍 Current: {addr}{age}', fr: '📍 Actuel : {addr}{age}' ,
                       id: '📍 Alamat saat ini: {addr}{age}',
                       ru: '📍 Текущий адрес: {addr}{age}',
                       de: '📍 Aktuell: {addr}{age}',
                       zh: '📍 当前地址：{addr}{age}',
                       ja: '📍 現在地: {addr}{age}',
                       es: '📍 Actual: {addr}{age}',
                       ko: '📍 현재 위치: {addr}{age}'
                     },
  'location.age.justShared':   { en: ' (just shared)', fr: ' (à l’instant)' ,
                              id: ' (baru saja dibagikan)',
                              ru: ' (только что)',
                              de: ' (gerade geteilt)',
                              zh: '（刚刚分享）',
                              ja: '（共有したばかり）',
                              es: ' (recién compartido)',
                              ko: ' (방금 공유됨)'
                            },
  'location.age.minAgo':       { en: ' ({n} min ago)', fr: ' (il y a {n} min)' ,
                          id: ' ({n} menit yang lalu)',
                          ru: ' ({n} минут назад)',
                          de: ' (vor {n} Minuten)',
                          zh: '（{n}分钟前）',
                          ja: ' ({n}分前)',
                          es: ' (hace {n} minutos)',
                          ko: ' ({n}분 전)'
                        },
  'location.age.hourAgo':      { en: ' ({h} h {m} min ago)', fr: ' (il y a {h} h {m} min)' ,
                           id: ' ({h} jam {m} menit yang lalu)',
                           ru: ' ({h} ч {m} мин назад)',
                           de: ' (vor {h} Std. {m} Min.)',
                           zh: '（{h}小时{m}分钟前）',
                           ja: ' ({h}時間{m}分前)',
                           es: ' (hace {h} h {m} min)',
                           ko: ' ({h}시간 {m}분 전)'
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
                         es: '👋 ¡Bienvenido de nuevo! Soleat sigue usando la ubicación que compartiste anteriormente. ¿Sigues ahí o prefieres configurar una nueva?',
                         ko: '👋 다시 오신 것을 환영합니다! Soleat은 이전에 공유하신 위치를 계속 사용하고 있습니다. 아직 그곳에 계신가요, 아니면 새로 설정하시겠어요?'
                       },
  'wake.keepBtn':              { en: '✅ Stay here', fr: '✅ Rester ici' ,
                   id: '✅ Tetap di sini',
                   ru: '✅ Остаться здесь',
                   de: '✅ Hier bleiben',
                   zh: '✅ 留在这里',
                   ja: '✅ ここのままにする',
                   es: '✅ Quedarme aquí',
                   ko: '✅ 여기 그대로'
                 },
  'wake.newBtn':               { en: '📍 New location', fr: '📍 Nouvelle position' ,
                  id: '📍 Lokasi baru',
                  ru: '📍 Новое местоположение',
                  de: '📍 Neuer Standort',
                  zh: '📍 新地点',
                  ja: '📍 新しい場所',
                  es: '📍 Nueva ubicación',
                  ko: '📍 새 위치'
                },
  'wake.kept':                 { en: '👍 Keeping your saved location.', fr: '👍 Position enregistrée conservée.' ,
                id: '👍 Lokasi tersimpan Anda dipertahankan.',
                ru: '👍 Сохранённое местоположение оставлено.',
                de: '👍 Ihr gespeicherter Standort bleibt erhalten.',
                zh: '👍 已保留您保存的位置。',
                ja: '👍 保存した位置情報を保持します。',
                es: '👍 Conservando tu ubicación guardada.',
                ko: '👍 저장된 위치를 유지합니다.'
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
                 es: '👋 Bienvenido de nuevo a Soleat. Comparte tu ubicación actual para que Soleat pueda compararla con tu ancla de búsqueda guardada.',
                 ko: '👋 Soleat에 다시 오신 것을 환영합니다. 현재 위치를 공유해 주시면 저장된 검색 기준점과 비교해 드립니다.'
               },
  'wake2.body':                {
    en: '👋 <b>Welcome back to Soleat</b>\n\nYour device now appears to be near: <i>{deviceStreet}</i>\n\nSoleat is still using your saved search anchor:\n<b>{anchor}</b>\n\nContinue searching from the anchor, or update to your current location?\n\n<i>You can also type /l to search from another place, for example:\n/l Orchard Road\n/l IOI City Mall</i>',
    fr: '👋 <b>Content de vous revoir sur Soleat</b>\n\nVotre appareil semble être près de : <i>{deviceStreet}</i>\n\nSoleat utilise toujours votre point de recherche enregistré :\n<b>{anchor}</b>\n\nContinuer depuis ce point, ou utiliser votre position actuelle ?\n\n<i>Vous pouvez aussi taper /l pour chercher depuis un autre lieu, par exemple :\n/l Orchard Road\n/l IOI City Mall</i>',
    id: '👋 <b>Selamat datang kembali di Soleat</b>\n\nPerangkat Anda tampaknya berada di dekat: <i>{deviceStreet}</i>\n\nSoleat masih memakai titik acuan pencarian tersimpan Anda:\n<b>{anchor}</b>\n\nLanjutkan mencari dari titik acuan, atau perbarui ke lokasi Anda saat ini?\n\n<i>Anda juga bisa mengetik /l untuk mencari dari tempat lain, misalnya:\n/l Orchard Road\n/l IOI City Mall</i>',
    ru: '👋 <b>Добро пожаловать обратно в Soleat</b>\n\nВаше устройство, похоже, находится рядом с: <i>{deviceStreet}</i>\n\nSoleat по-прежнему использует сохраненный вами якорь поиска:\n<b>{anchor}</b>\n\nПродолжить поиск с указанной точки или обновить данные, указав текущее местоположение?\n\n<i>Вы также можете ввести /l для поиска из другого места, например:\n/l Орчард Роуд\n/l Торговый центр IOI City Mall</i>',
    de: '👋 <b>Willkommen zurück bei Soleat</b>\n\nIhr Gerät befindet sich nun in der Nähe von: <i>{deviceStreet}</i>\n\nSoleat verwendet weiterhin Ihren gespeicherten Suchanker:\n<b>{anchor}</b>\n\nSuche vom Ausgangspunkt aus fortsetzen oder zu Ihrem aktuellen Standort wechseln?\n\n<i>Sie können auch /l eingeben, um von einem anderen Ort aus zu suchen, zum Beispiel:\n/l Orchard Road\n/l IOI City Mall</i>',
    zh: '👋 <b>欢迎回到 Soleat</b>\n\n您的设备现在似乎位于：<i>{deviceStreet}</i>\n\nSoleat 仍在使用您保存的搜索锚点：\n<b>{anchor}</b>\n\n继续从锚点搜索，还是更新到您当前的位置？\n\n<i>您也可以输入 /l 从其他位置进行搜索，例如：\n/l 乌节路\n/l IOI City Mall</i>',
    ja: '👋 <b>Soleatへようこそ</b>\n\nお使いのデバイスは現在、<i>{deviceStreet}</i>付近にあります。\n\nSoleatは、保存済みの検索アンカーをまだ使用しています。\n<b>{anchor}</b>\n\nアンカー地点から検索を続けるか、現在地へ更新するか？\n\n<i>また、/l と入力して別の場所から検索することもできます。例:\n/l Orchard Road\n/l IOI City Mall</i>',
    es: '👋 <b>Bienvenido de nuevo a Soleat</b>\n\nTu dispositivo ahora parece estar cerca de: <i>{deviceStreet}</i>\n\nSoleat sigue utilizando el ancla de búsqueda guardada:\n<b>{anchor}</b>\n\n¿Continuar la búsqueda desde el ancla o actualizar a tu ubicación actual?\n\n<i>También puedes escribir /l para buscar desde otro lugar, por ejemplo:\n/l Orchard Road\n/l IOI City Mall</i>',
    ko: '👋 <b>Soleat에 다시 오신 것을 환영합니다</b>\n\n현재 기기는 다음 위치 근처에 있는 것으로 보입니다: <i>{deviceStreet}</i>\n\nSoleat은 저장된 검색 기준점을 계속 사용하고 있습니다:\n<b>{anchor}</b>\n\n기준점에서 계속 검색할까요, 아니면 현재 위치로 변경할까요?\n\n<i>/l 을 입력해 다른 장소에서 검색할 수도 있습니다. 예:\n/l Orchard Road\n/l IOI City Mall</i>'
  },
  'wake2.btnCurrent':          { en: '📍 Use current location', fr: '📍 Position actuelle' ,
                       id: '📍 Gunakan lokasi saat ini',
                       ru: '📍 Использовать текущее местоположение',
                       de: '📍 Aktuellen Standort verwenden',
                       zh: '📍 使用当前位置',
                       ja: '📍 現在地を使用',
                       es: '📍 Usar ubicación actual',
                       ko: '📍 현재 위치 사용'
                     },
  'wake2.btnKeep':             { en: '✅ Keep earlier location', fr: '✅ Garder le précédent' ,
                    id: '✅ Pertahankan lokasi sebelumnya',
                    ru: '✅ Оставить прежнее местоположение',
                    de: '✅ Früheren Standort beibehalten',
                    zh: '✅ 保留先前的位置',
                    ja: '✅ 以前の場所を保持する',
                    es: '✅ Mantener la ubicación anterior',
                    ko: '✅ 이전 위치 유지'
                  },
  'wake2.btnAnother':          { en: '🗺 Set another location', fr: '🗺 Définir un autre lieu' ,
                       id: '🗺 Tetapkan lokasi lain',
                       ru: '🗺 Указать другое местоположение',
                       de: '🗺 Einen anderen Standort festlegen',
                       zh: '🗺 设置其他位置',
                       ja: '🗺 別の場所を設定する',
                       es: '🗺 Establecer otra ubicación',
                       ko: '🗺 다른 위치 설정'
                     },
  'wake2.currentApplied':      { en: '👍 Anchor updated to <i>{street}</i>.', fr: '👍 Point mis à jour vers <i>{street}</i>.' ,
                           id: '👍 Titik acuan pencarian diperbarui ke <i>{street}</i>.',
                           ru: '👍 Якорь обновлен до <i>{street}</i>.',
                           de: '👍 Anker aktualisiert auf <i>{street}</i>.',
                           zh: '👍 锚点已更新为 <i>{street}</i>。',
                           ja: '👍 アンカーを <i>{street}</i> に更新しました。',
                           es: '👍 Ancla actualizada a <i>{street}</i>.',
                           ko: '👍 기준점을 <i>{street}</i>(으)로 변경했습니다.'
                         },
  'wake2.kept':                { en: '👍 Keeping your saved search anchor.', fr: '👍 Point de recherche conservé.' ,
                 id: '👍 Titik acuan pencarian tersimpan Anda dipertahankan.',
                 ru: '👍 Сохранённый якорь поиска оставлен.',
                 de: '👍 Ihr gespeicherter Suchanker bleibt erhalten.',
                 zh: '👍 保留您保存的搜索锚点。',
                 ja: '👍 保存した検索アンカーを保持します。',
                 es: '👍 Conservando tu ancla de búsqueda guardada.',
                 ko: '👍 저장된 검색 기준점을 유지합니다.'
               },
  'wake2.anotherHint':         {
    en: 'Type /l <place> to set a new anchor — for example /l Orchard Road or /l IOI City Mall. Or tap 📍 below to share a fresh GPS location.',
    fr: 'Tapez /l <lieu> pour définir un nouveau point — par exemple /l Orchard Road ou /l IOI City Mall. Ou touchez 📍 ci-dessous pour partager une position GPS fraîche.',
    id: 'Ketik /l <place> untuk menetapkan titik acuan baru — misalnya /l Orchard Road atau /l IOI City Mall. Atau ketuk 📍 di bawah untuk membagikan lokasi GPS terbaru.',
    ru: 'Введите /l <place>, чтобы задать новый якорь — например /l Orchard Road или /l IOI City Mall. Либо нажмите 📍 ниже, чтобы отправить свежие GPS-координаты.',
    de: 'Tippen Sie /l <place>, um einen neuen Anker zu setzen — zum Beispiel /l Orchard Road oder /l IOI City Mall. Oder tippen Sie unten auf 📍, um einen frischen GPS-Standort zu teilen.',
    zh: '输入 /l <place> 即可设置新的锚点 — 例如 /l Orchard Road 或 /l IOI City Mall。也可以点击下方的 📍 分享最新的 GPS 位置。',
    ja: '/l <place> と入力すると新しいアンカーを設定できます — 例: /l Orchard Road や /l IOI City Mall。または下の 📍 をタップして最新の GPS 位置を共有してください。',
    es: 'Escribe /l <place> para fijar una nueva ancla — por ejemplo /l Orchard Road o /l IOI City Mall. O toca 📍 abajo para compartir una ubicación GPS nueva.',
    ko: '/l <장소> 를 입력해 새 기준점을 설정하세요 — 예: /l Orchard Road 또는 /l IOI City Mall. 또는 아래 📍 를 눌러 새 GPS 위치를 공유하세요.'
  },
  'wake2.offerExpired':        {
    en: '⏱ That share expired. Tap /l to set a new anchor.',
    fr: '⏱ Ce partage a expiré. Tapez /l pour définir un nouveau point.',
    id: '⏱ Berbagi lokasi tersebut telah kedaluwarsa. Ketuk /l untuk mengatur titik acuan baru.',
    ru: '⏱ Срок действия этой публикации истек. Нажмите /l, чтобы установить новый якорь.',
    de: '⏱ Diese Freigabe ist abgelaufen. Tippen Sie auf /l, um einen neuen Anker festzulegen.',
    zh: '⏱ 该共享已过期。点击 /l 设置新的锚点。',
    ja: '⏱ その共有は期限切れです。/l をタップして新しいアンカーを設定してください。',
    es: '⏱ Esa ubicación compartida ha caducado. Pulsa /l para establecer una nueva ancla.',
    ko: '⏱ 해당 공유는 만료되었습니다. /l 을 눌러 새 기준점을 설정하세요.'
  },

  // v0.59.3 — one-map buttons for transport sub-views.
  'transport.map.incidentsCaption': { en: '🗺 View {n} incidents on one map:', fr: '🗺 Voir les {n} incidents sur une carte :' ,
                                     id: '🗺 Lihat {n} insiden di satu peta:',
                                     ru: '🗺 Отобразить {n} инцидентов на одной карте:',
                                     de: '🗺 {n} Vorfälle auf einer Karte anzeigen:',
                                     zh: '🗺 在一张地图上查看{n}起事件：',
                                     ja: '🗺 1つの地図で{n}件の交通障害を表示：',
                                     es: '🗺 Visualiza {n} incidentes en un solo mapa:',
                                     ko: '🗺 {n}건의 교통 상황을 한 지도에서 보기:'
                                   },
  'transport.map.incidentsBtn':     { en: 'Show {n} incidents on the Map', fr: 'Afficher {n} incidents sur la carte' ,
                                 id: 'Tampilkan {n} insiden pada Peta',
                                 ru: 'Показать {n} инцидентов на карте',
                                 de: '{n} Vorfälle auf der Karte anzeigen',
                                 zh: '在地图上显示{n}起事件',
                                 ja: '地図上に{n}件の交通障害を表示',
                                 es: 'Mostrar {n} incidentes en el mapa',
                                 ko: '지도에서 {n}건 보기'
                               },
  'transport.map.busStopsCaption':  { en: '🗺 View {n} bus stops on one map:', fr: '🗺 Voir les {n} arrêts sur une carte :' ,
                                    id: '🗺 Lihat {n} halte bus dalam satu peta:',
                                    ru: '🗺 Посмотреть {n} автобусных остановок на одной карте:',
                                    de: '🗺 {n} Bushaltestellen auf einer Karte anzeigen:',
                                    zh: '🗺 在一张地图上查看{n}个公交车站：',
                                    ja: '🗺 1つの地図上に{n}個のバス停を表示：',
                                    es: '🗺 Visualiza {n} paradas de autobús en un solo mapa:',
                                    ko: '🗺 버스 정류장 {n}곳을 한 지도에서 보기:'
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
                                es: 'Mostrar todas las {n} paradas de autobús',
                                ko: '버스 정류장 {n}곳 모두 보기'
                              },
  'transport.map.stationsCaption':  { en: '🗺 View {n} stations on one map:', fr: '🗺 Voir les {n} stations sur une carte :' ,
                                    id: '🗺 Lihat {n} stasiun dalam satu peta:',
                                    ru: '🗺 Отобразить {n} станций на одной карте:',
                                    de: '🗺 {n} Stationen auf einer Karte anzeigen:',
                                    zh: '🗺 在一张地图上查看{n}个站点：',
                                    ja: '🗺 1つの地図上に{n}個の駅を表示：',
                                    es: '🗺 Visualiza {n} estaciones en un solo mapa:',
                                    ko: '🗺 역 {n}곳을 한 지도에서 보기:'
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
                                es: 'Ver {n} estaciones de tren',
                                ko: '지하철역 {n}곳 보기'
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
                                 es: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>',
                                 ko: '{name} · {dist}{crowd} <a href="{gmapsUrl}">↗</a>'
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
    es: '⏳ Soleat sigue trabajando en tu última solicitud; espera un momento.',
    ko: '⏳ Soleat이 아직 이전 요청을 처리하고 있습니다 — 잠시만 기다려 주세요.'
  },
  'hidden.huntingLegacy':         {
    en: '🎲 Hunting for one hidden gem 1.5–3 km away…',
    fr: '🎲 À la recherche d’un trésor caché à 1,5–3 km…',
    id: '🎲 Mencari satu permata tersembunyi berjarak 1,5–3 km…',
    ru: '🎲 Ищу одну скрытую жемчужину в 1,5–3 км отсюда…',
    de: '🎲 Suche nach einem versteckten Juwel in 1,5–3 km Entfernung…',
    zh: '🎲 正在寻找 1.5–3 公里外的一处隐藏宝藏…',
    ja: '🎲 1.5〜3 km 先の隠れた名店を探しています…',
    es: '🎲 Buscando una joya escondida a 1,5–3 km…',
    ko: '🎲 1.5–3km 거리의 숨은 맛집을 찾는 중…'
  },
  'hidden.legacyNotFound':        {
    en: 'Soleat couldn\'t find a hidden gem in your annulus. Try moving area or open /cuisine.',
    fr: 'Soleat n’a pas trouvé de trésor dans votre zone. Essayez ailleurs ou ouvrez /cuisine.',
    id: 'Soleat tidak menemukan permata tersembunyi di radius itu. Coba pindah area atau buka /cuisine.',
    ru: 'Soleat не нашёл скрытых жемчужин в этом кольце. Попробуйте другой район или откройте /cuisine.',
    de: 'Soleat hat in Ihrem Umkreis kein verstecktes Juwel gefunden. Versuchen Sie eine andere Gegend oder öffnen Sie /cuisine.',
    zh: 'Soleat 在该范围内没有找到隐藏宝藏。换个区域试试，或打开 /cuisine。',
    ja: 'Soleat はこの範囲で隠れた名店を見つけられませんでした。エリアを変えるか /cuisine を開いてください。',
    es: 'Soleat no encontró ninguna joya escondida en esa franja. Prueba en otra zona o abre /cuisine.',
    ko: '해당 범위에서 숨은 맛집을 찾지 못했습니다. 지역을 옮기시거나 /cuisine 을 열어 보세요.'
  },
  'hidden.anchorAmbiguous':       {
    en: 'I couldn\'t pinpoint your area{anchor}. Type the building or area you\'re at — for example \'Raffles Place MRT Exit A\' or \'Holland Village\' — and I\'ll re-anchor /hidden.',
    fr: 'Je n’ai pas pu cerner votre zone{anchor}. Tapez le bâtiment ou le quartier où vous êtes — par exemple « Raffles Place MRT Exit A » ou « Holland Village » — et je ré-ancrerai /hidden.',
    id: 'Saya tidak bisa memastikan area Anda{anchor}. Ketik nama gedung atau kawasan tempat Anda berada — misalnya \'Raffles Place MRT Exit A\' atau \'Holland Village\' — dan saya akan menetapkan ulang acuan /hidden.',
    ru: 'Не удалось точно определить ваш район{anchor}. Введите здание или район, где вы находитесь — например «Raffles Place MRT Exit A» или «Holland Village» — и я перенастрою /hidden.',
    de: 'Ich konnte Ihre Gegend nicht genau bestimmen{anchor}. Tippen Sie das Gebäude oder Viertel ein, in dem Sie sich befinden — zum Beispiel „Raffles Place MRT Exit A“ oder „Holland Village“ — und ich verankere /hidden neu.',
    zh: '我无法确定您所在的区域{anchor}。请输入您所在的建筑或地区 — 例如“Raffles Place MRT Exit A”或“Holland Village” — 我会重新锚定 /hidden。',
    ja: 'エリアを特定できませんでした{anchor}。今いる建物または地区を入力してください — 例:「Raffles Place MRT Exit A」や「Holland Village」 — /hidden を再設定します。',
    es: 'No pude precisar tu zona{anchor}. Escribe el edificio o barrio en el que estás — por ejemplo «Raffles Place MRT Exit A» u «Holland Village» — y volveré a anclar /hidden.',
    ko: '계신 지역을 정확히 파악하지 못했습니다{anchor}. 계신 건물이나 지역을 입력해 주세요 — 예: \'Raffles Place MRT Exit A\' 또는 \'Holland Village\' — 그러면 /hidden 의 기준점을 다시 잡겠습니다.'
  },
  'hidden.anchorAmbiguous.got':   {
    en: ' (got "{name}")',
    fr: ' (reçu : « {name} »)',
    id: ' (diterima "{name}")',
    ru: ' (получено «{name}»)',
    de: ' (erhalten: „{name}“)',
    zh: '（收到“{name}”）',
    ja: '（「{name}」を受信）',
    es: ' (recibido «{name}»)',
    ko: ' (「{name}」(으)로 인식)'
  },
  'hidden.searching':             {
    en: '🔍 Searching hidden gems near {anchor}… please wait.',
    fr: '🔍 Recherche de trésors près de {anchor}… veuillez patienter.',
    id: '🔍 Mencari permata tersembunyi di dekat {anchor}… mohon tunggu.',
    ru: '🔍 Ищу скрытые жемчужины рядом с {anchor}… пожалуйста, подождите.',
    de: '🔍 Suche versteckte Juwelen in der Nähe von {anchor}… bitte warten.',
    zh: '🔍 正在 {anchor} 附近寻找隐藏宝藏…请稍候。',
    ja: '🔍 {anchor} 周辺の隠れた名店を検索中…お待ちください。',
    es: '🔍 Buscando joyas escondidas cerca de {anchor}… espera un momento.',
    ko: '🔍 {anchor} 근처의 숨은 맛집을 찾는 중… 잠시만 기다려 주세요.'
  },
  'hidden.progress.1':            {
    en: '⏳ Still searching… cross-referencing recent food blogs and IG posts.',
    fr: '⏳ Recherche en cours… recoupement des blogs et posts IG récents.',
    id: '⏳ Masih mencari… menyilangkan blog kuliner dan unggahan IG terbaru.',
    ru: '⏳ Всё ещё ищу… сверяю свежие фуд-блоги и посты в IG.',
    de: '⏳ Suche läuft… gleiche aktuelle Food-Blogs und IG-Posts ab.',
    zh: '⏳ 仍在搜索…正在比对近期美食博客与 IG 帖子。',
    ja: '⏳ まだ検索中…最近のフードブログと IG 投稿を照合しています。',
    es: '⏳ Sigo buscando… cruzando blogs gastronómicos y publicaciones de IG recientes.',
    ko: '⏳ 아직 찾는 중… 최근 음식 블로그와 인스타그램 게시물을 대조하고 있습니다.'
  },
  'hidden.progress.2':            {
    en: '⏳ Verifying source quality…',
    fr: '⏳ Vérification de la qualité des sources…',
    id: '⏳ Memverifikasi kualitas sumber…',
    ru: '⏳ Проверяю качество источников…',
    de: '⏳ Prüfe die Qualität der Quellen…',
    zh: '⏳ 正在核验来源质量…',
    ja: '⏳ 情報源の信頼性を確認中…',
    es: '⏳ Verificando la calidad de las fuentes…',
    ko: '⏳ 출처의 신뢰도를 확인하는 중…'
  },
  'hidden.progress.3':            {
    en: '⏳ Checking opening dates and review counts against Google…',
    fr: '⏳ Vérification des dates d’ouverture et du nombre d’avis sur Google…',
    id: '⏳ Mencocokkan tanggal buka dan jumlah ulasan dengan Google…',
    ru: '⏳ Сверяю даты открытия и количество отзывов с Google…',
    de: '⏳ Gleiche Eröffnungsdaten und Bewertungszahlen mit Google ab…',
    zh: '⏳ 正在与 Google 核对开业日期和评价数量…',
    ja: '⏳ 開店日とレビュー数を Google と照合中…',
    es: '⏳ Comprobando fechas de apertura y número de reseñas en Google…',
    ko: '⏳ 구글에서 개업일과 리뷰 수를 확인하는 중…'
  },
  'hidden.progress.4':            {
    en: '⏳ Almost there — drafting the picks.',
    fr: '⏳ Presque fini — rédaction des choix.',
    id: '⏳ Hampir selesai — sedang menyusun pilihannya.',
    ru: '⏳ Почти готово — составляю подборку.',
    de: '⏳ Fast fertig — die Auswahl wird zusammengestellt.',
    zh: '⏳ 快好了 — 正在整理推荐。',
    ja: '⏳ もう少しです — おすすめをまとめています。',
    es: '⏳ Casi listo — preparando las recomendaciones.',
    ko: '⏳ 거의 다 됐습니다 — 추천 목록을 정리하고 있습니다.'
  },
  'hidden.progress.5':            {
    en: '⏳ Hang tight — Gemini is being thorough so the picks aren\'t fluff.',
    fr: '⏳ Patientez — Gemini fait ça soigneusement pour éviter les choix bidons.',
    id: '⏳ Sabar sebentar — Gemini sedang teliti agar pilihannya bukan asal-asalan.',
    ru: '⏳ Немного терпения — Gemini работает тщательно, чтобы подборка не была пустой.',
    de: '⏳ Einen Moment — Gemini arbeitet gründlich, damit die Auswahl kein Füllmaterial ist.',
    zh: '⏳ 请稍候 — Gemini 正在仔细筛选，避免敷衍的推荐。',
    ja: '⏳ もう少しお待ちください — Gemini が丁寧に選んでいるので、中身のない推薦にはなりません。',
    es: '⏳ Un momento — Gemini está siendo minucioso para que las recomendaciones no sean relleno.',
    ko: '⏳ 조금만 기다려 주세요 — 추천이 부실하지 않도록 Gemini가 꼼꼼히 확인하고 있습니다.'
  },
  'hidden.timeout':               {
    en: '⏱ /hidden timed out after 4 minutes — Gemini was unresponsive on every fallback model.\n\nThis usually clears in a few minutes. Try again, or check Google AI Studio status if it persists.',
    fr: '⏱ /hidden a dépassé le délai de 4 minutes — Gemini n’a pas répondu sur aucun modèle de repli.\n\nCela se résout en général en quelques minutes. Réessayez, ou vérifiez l’état de Google AI Studio si le problème persiste.',
    id: '⏱ /hidden habis waktu setelah 4 menit — Gemini tidak merespons di semua model cadangan.\n\nBiasanya pulih dalam beberapa menit. Coba lagi, atau periksa status Google AI Studio jika terus terjadi.',
    ru: '⏱ /hidden прервался по тайм-ауту через 4 минуты — Gemini не ответил ни на одной запасной модели.\n\nОбычно это проходит за несколько минут. Попробуйте снова или проверьте статус Google AI Studio, если повторяется.',
    de: '⏱ /hidden ist nach 4 Minuten abgelaufen — Gemini hat auf keinem Ersatzmodell geantwortet.\n\nDas löst sich meist in wenigen Minuten. Versuchen Sie es erneut oder prüfen Sie den Status von Google AI Studio, wenn es anhält.',
    zh: '⏱ /hidden 在 4 分钟后超时 — 所有备用模型上 Gemini 均无响应。\n\n通常几分钟后就会恢复。请重试，若持续出现请查看 Google AI Studio 状态。',
    ja: '⏱ /hidden は 4 分でタイムアウトしました — すべてのフォールバックモデルで Gemini が無応答でした。\n\n通常は数分で解消します。再試行するか、続く場合は Google AI Studio のステータスをご確認ください。',
    es: '⏱ /hidden ha expirado tras 4 minutos — Gemini no respondió en ningún modelo de reserva.\n\nSuele resolverse en unos minutos. Inténtalo de nuevo o revisa el estado de Google AI Studio si persiste.',
    ko: '⏱ /hidden 이 4분 후 시간 초과되었습니다 — 모든 대체 모델에서 Gemini가 응답하지 않았습니다.\n\n보통 몇 분 안에 해결됩니다. 다시 시도하시거나, 계속된다면 Google AI Studio 상태를 확인해 주세요.'
  },
  'hidden.overload':              {
    en: '⚠️ Gemini is currently overloaded (503 high demand on every fallback model).\n\nTry /hidden again in a minute or two — your location is still cached so retry will be fast.',
    fr: '⚠️ Gemini est actuellement saturé (erreur 503 « high demand » sur tous les modèles de repli).\n\nRéessayez /hidden dans une minute ou deux — votre position est en cache, le réessai sera rapide.',
    id: '⚠️ Gemini sedang kelebihan beban (503 permintaan tinggi di semua model cadangan).\n\nCoba /hidden lagi satu dua menit — lokasi Anda masih tersimpan, jadi percobaan ulang akan cepat.',
    ru: '⚠️ Gemini сейчас перегружен (503, высокий спрос на всех запасных моделях).\n\nПопробуйте /hidden через минуту-две — ваше местоположение в кэше, повтор будет быстрым.',
    de: '⚠️ Gemini ist derzeit überlastet (503, hohe Nachfrage auf allen Ersatzmodellen).\n\nVersuchen Sie /hidden in ein bis zwei Minuten erneut — Ihr Standort ist noch zwischengespeichert, der Neuversuch geht schnell.',
    zh: '⚠️ Gemini 当前过载（所有备用模型均返回 503 高需求）。\n\n请一两分钟后重试 /hidden — 您的位置仍在缓存中，重试会很快。',
    ja: '⚠️ Gemini は現在混雑しています（すべてのフォールバックモデルで 503 の高負荷）。\n\n1〜2 分後にもう一度 /hidden をお試しください — 位置情報はキャッシュ済みなので再試行は高速です。',
    es: '⚠️ Gemini está saturado ahora mismo (error 503 por alta demanda en todos los modelos de reserva).\n\nVuelve a probar /hidden en un minuto o dos — tu ubicación sigue en caché, así que el reintento será rápido.',
    ko: '⚠️ 현재 Gemini에 과부하가 걸려 있습니다 (모든 대체 모델에서 503, 요청 급증).\n\n1~2분 후에 /hidden 을 다시 시도해 주세요 — 위치가 캐시되어 있어 재시도는 빠릅니다.'
  },
  'hidden.outerError':            {
    en: 'Sorry, /hidden hit an unexpected error. The team\'s been notified — please retry shortly.',
    fr: 'Désolé, /hidden a rencontré une erreur inattendue. L’équipe a été notifiée — veuillez réessayer bientôt.',
    id: 'Maaf, /hidden mengalami kesalahan tak terduga. Tim sudah diberi tahu — silakan coba lagi sebentar lagi.',
    ru: 'Извините, в /hidden произошла непредвиденная ошибка. Команда уведомлена — повторите попытку чуть позже.',
    de: 'Entschuldigung, /hidden ist auf einen unerwarteten Fehler gestoßen. Das Team ist informiert — bitte versuche es gleich noch einmal.',
    zh: '抱歉，/hidden 遇到意外错误。团队已收到通知 — 请稍后重试。',
    ja: '申し訳ありません、/hidden で予期しないエラーが発生しました。チームに通知済みです — 少し後にもう一度お試しください。',
    es: 'Lo sentimos, /hidden ha dado un error inesperado. El equipo ha sido avisado — inténtalo de nuevo en breve.',
    ko: '죄송합니다. /hidden 실행 중 예기치 않은 오류가 발생했습니다. 팀에 알렸으니 잠시 후 다시 시도해 주세요.'
  },
  'hidden.allClosed':             {
    en: 'All picks Gemini found turned out to be temporarily or permanently closed. Try again in a minute — Gemini may surface different gems on retry.',
    fr: 'Toutes les trouvailles proposées par Gemini se sont révélées temporairement ou définitivement fermées. Réessayez dans une minute — Gemini peut proposer d’autres trésors.',
    id: 'Semua pilihan yang ditemukan Gemini ternyata tutup sementara atau permanen. Coba lagi sebentar lagi — Gemini mungkin memunculkan permata lain.',
    ru: 'Все найденные Gemini места оказались временно или окончательно закрыты. Попробуйте через минуту — Gemini может предложить другие жемчужины.',
    de: 'Alle von Gemini gefundenen Tipps waren vorübergehend oder dauerhaft geschlossen. Versuchen Sie es in einer Minute erneut — Gemini findet beim nächsten Mal vielleicht andere Juwelen.',
    zh: 'Gemini 找到的推荐都已暂时或永久停业。请一分钟后重试 — Gemini 可能会给出别的宝藏。',
    ja: 'Gemini が見つけた候補はすべて一時休業または閉店でした。1 分ほど後にもう一度お試しください — 別の名店が出てくるかもしれません。',
    es: 'Todas las recomendaciones que encontró Gemini resultaron estar cerradas temporal o definitivamente. Inténtalo en un minuto — Gemini puede sacar otras joyas.',
    ko: 'Gemini가 찾은 곳이 모두 임시 또는 영구 휴업 상태였습니다. 잠시 후 다시 시도해 주세요 — 재시도하면 다른 곳을 찾아낼 수 있습니다.'
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
    es: '📝 Última reseña ·',
    ko: '📝 최신 리뷰 ·'
  },

  // v0.59.4 — single-pick result-card "Nearby carparks" map button.
  'card.carparkMapBtn':           { en: '🅿️ Nearby carparks on map', fr: '🅿️ Parkings proches sur la carte' ,
                         id: '🅿️ Lokasi parkir terdekat di peta',
                         ru: '🅿️ Ближайшие парковки на карте',
                         de: '🅿️ Parkplätze in der Nähe auf der Karte',
                         zh: '🅿️ 地图上的附近停车场',
                         ja: '🅿️ 地図上の近隣駐車場',
                         es: '🅿️ Aparcamientos cercanos en el mapa',
                         ko: '🅿️ 근처 주차장 지도에서 보기'
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
    ].join('\n'),
    ko: [
      '🔒 *개인정보 및 데이터*',
      '',
      'Soleat은 봇 운영에 필요한 것만 보관합니다.',
      '',
      '근처 결과를 안내하기 위해 위치 정보는 최대 24시간 동안 기억될 수 있습니다. 간단한 클립보드에 저장하신 장소와 위치를 담아 둘 수 있으며, 작은 미식 여행 일지나 스크랩북처럼 쓸 수 있습니다.',
      '',
      '개인 프로필은 만들지 않습니다. Soleat은 트래커를 사용하지 않고, 데이터를 판매하지 않으며, 봇 간에 프로필을 구성하지도 않습니다.',
      '',
      '/forgetme 를 입력하시면 언제든지 저장된 데이터를 삭제할 수 있습니다.'
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
    es: 'Lo sentimos, se ha producido un error en /privacy. Inténtalo de nuevo en un momento.',
    ko: '죄송합니다. /privacy 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
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
    ].join('\n'),
    ko: [
      '🔖 *법적 고지 및 면책 조항*',
      '',
      'Soleat은 일반적인 편의와 미식 탐색을 위해 "있는 그대로" 제공됩니다. AI, 자동화 도구, Google Places, 싱가포르 공공 데이터 및 기타 실시간 출처를 이용할 수 있습니다.',
      '',
      '정보는 부정확하거나 지연되거나 불완전하거나 오래된 것일 수 있습니다. 특히 🟢 영업시간, 🕌 할랄 여부, 🥗 채식 메뉴, 🐾 반려동물 동반, 🏠 가정집 기반 업소, 교통 시간, 말레이시아 이동에 대해서는 해당 업소에 직접 확인해 주세요.',
      '',
      'Soleat은 주로 싱가포르를 다룹니다. 조호르바루를 선택하면 말레이시아 조호르주의 결과가 포함될 수 있으며, 데이터 품질은 주로 Google Places에 있는 정보에 따라 달라집니다.',
      '',
      'Soleat은 전문적인 조언이 아닙니다. 결과를 어떻게 이용할지는 이용자의 책임입니다. 제작자는 싱가포르 법이 허용하는 최대 범위에서, 이용으로 인한 손실, 청구, 중단 또는 신뢰에 대해 책임지지 않습니다.',
      '',
      '제작자는 어떠한 권리도 침해할 의도가 없습니다. 문의나 게시 중단 요청은 [linkedin.com/in/angadrian](https://linkedin.com/in/angadrian) 으로 연락해 주세요.',
      '',
      '데이터 처리에 대해서는 /privacy 를 참고하세요.',
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
    es: 'Lo sentimos, /legal ha dado un error. Inténtalo de nuevo en un momento.',
    ko: '죄송합니다. /legal 실행 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  },

  // v0.59.13 — /recognised localisation
  'recognised.heading':           { en: '🏆 *Singapore — recognised dining*', fr: '🏆 *Singapour — restaurants reconnus*' ,
                         id: '🏆 *Singapura — restoran ternama*',
                         ru: '🏆 *Сингапур — признанные рестораны*',
                         de: '🏆 *Singapur – anerkannte Gastronomie*',
                         zh: '🏆 *新加坡 — 认可的餐饮*',
                         ja: '🏆 *シンガポール - 認定レストラン*',
                         es: '🏆 *Singapur — restaurantes reconocidos*',
                         ko: '🏆 *싱가포르 — 인정받은 다이닝*'
                       },
  'recognised.tap':               { en: 'Tap a list to open the source page:', fr: 'Touchez une liste pour ouvrir la page source :' ,
                     id: 'Ketuk daftar untuk membuka halaman sumber:',
                     ru: 'Нажмите на пункт списка, чтобы открыть исходную страницу:',
                     de: 'Tippen Sie auf eine Liste, um die Quellseite zu öffnen:',
                     zh: '点击列表即可打开源页面：',
                     ja: 'リストをタップしてソースページを開きます。',
                     es: 'Pulsa una lista para abrir la página de origen:',
                     ko: '목록을 누르면 출처 페이지가 열립니다:'
                   },
  'recognised.btn.bib':           { en: '🍜 MICHELIN Bib Gourmand', fr: '🍜 MICHELIN Bib Gourmand' ,
                         id: '🍜 MICHELIN Bib Gourmand',
                         ru: '🍜 MICHELIN Bib Gourmand',
                         de: '🍜 MICHELIN Bib Gourmand',
                         zh: '🍜 米其林必比登推介',
                         ja: '🍜 ミシュラン・ビブグルマン',
                         es: '🍜 MICHELIN Bib Gourmand',
                         ko: '🍜 미쉐린 빕구르망'
                       },
  'recognised.btn.star':          { en: '⭐ MICHELIN Star', fr: '⭐ MICHELIN Étoile' ,
                          id: '⭐ Bintang MICHELIN',
                          ru: '⭐ Звезда Мишлен',
                          de: '⭐ MICHELIN Stern',
                          zh: '⭐米其林星级',
                          ja: '⭐ ミシュラン星付き',
                          es: '⭐ Estrella MICHELIN',
                          ko: '⭐ 미쉐린 스타'
                        },
  'recognised.btn.asia50':        { en: "🌏 Asia's 50 Best Restaurants", fr: '🌏 Asia\'s 50 Best Restaurants' ,
                            id: '🌏 50 Restoran Terbaik di Asia',
                            ru: '🌏 50 лучших ресторанов Азии',
                            de: '🌏 Asiens 50 beste Restaurants',
                            zh: '🌏 亚洲50佳餐厅',
                            ja: '🌏 アジアのベストレストラン50選',
                            es: '🌏 Los 50 mejores restaurantes de Asia',
                            ko: '🌏 아시아 베스트 레스토랑 50'
                          },
  'recognised.btn.localProduce':  { en: '🌱 Restaurants using Local Produce', fr: '🌱 Restaurants avec produits locaux' ,
                                  id: '🌱 Restoran yang menggunakan Produk Lokal',
                                  ru: '🌱 Рестораны, использующие местные продукты',
                                  de: '🌱 Restaurants, die regionale Produkte verwenden',
                                  zh: '🌱 使用本地食材的餐厅',
                                  ja: '🌱 地元産の食材を使ったレストラン',
                                  es: '🌱 Restaurantes que utilizan productos locales',
                                  ko: '🌱 지역 식재료를 쓰는 레스토랑'
                                },

  // v0.59.13 — /share localisation
  'share.empty':                  { en: 'No recent picks yet. Run /cuisine or /hidden first, then /share to forward to a friend.',
                                    fr: 'Aucun choix récent. Lancez /cuisine ou /hidden d\'abord, puis /share pour partager avec un ami.' ,
                  id: 'Belum ada pilihan terbaru. Jalankan /cuisine atau /hidden terlebih dahulu, lalu /share untuk meneruskan ke teman.',
                  ru: 'Пока нет недавних подборок. Сначала запустите /cuisine или /hidden, затем /share, чтобы переслать другу.',
                  de: 'Noch keine aktuellen Empfehlungen. Nutzen Sie zuerst /cuisine oder /hidden, dann /share, um eine Empfehlung an einen Freund weiterzuleiten.',
                  es: 'Aún no hay selecciones recientes. Ejecuta primero /cuisine o /hidden, luego /share para reenviarlo a un amigo.'
                ,
                  zh: '目前还没有精选内容。先运行 /cuisine 或 /hidden，再运行 /share 转发给朋友。',
                  ja: '最近のおすすめはまだありません。まず /cuisine または /hidden を実行し、次に /share を実行して友達に転送してください。',
                  ko: '아직 최근 선택 항목이 없습니다. 먼저 /cuisine 또는 /hidden 을 실행한 뒤 /share 로 친구에게 전달하세요.'
                },
  'share.prompt':                 { en: 'Pick a venue to forward to your friend ({n} recent):',
                                    fr: 'Choisissez un lieu à partager avec votre ami ({n} récents) :' ,
                   id: 'Pilih tempat untuk diteruskan ke teman Anda ({n} baru-baru ini):',
                   ru: 'Выберите заведение, чтобы отправить его другу (последние {n}):',
                   de: 'Wählen Sie ein Lokal aus, das Sie an Ihren Freund weiterleiten möchten ({n} zuletzt):',
                   zh: '选择要转发给朋友的地点（最近 {n} 个）：',
                   ja: '友達に転送する場所を選択してください（最近の{n}件）：',
                   es: 'Elige un lugar para reenviar a tu amigo ({n} recientes):',
                   ko: '친구에게 전달할 곳을 고르세요 (최근 {n}곳):'
                 },
  'share.mintFailed':             { en: "Sorry, I couldn't mint share links right now.",
                                    fr: 'Désolé, impossible de générer les liens de partage pour le moment.' ,
                       id: 'Maaf, saya tidak bisa membuat tautan berbagi saat ini.',
                       ru: 'Извините, сейчас не удалось создать ссылки для отправки.',
                       de: 'Tut mir leid, ich konnte im Moment keine Links zum Teilen erstellen.',
                       zh: '抱歉，我现在无法生成分享链接。',
                       ja: '申し訳ありませんが、現在、共有リンクを作成できません。',
                       es: 'Lo siento, no puedo generar enlaces para compartir en este momento.',
                       ko: '죄송합니다. 지금은 공유 링크를 만들 수 없습니다.'
                     },
  'share.error':                  { en: 'Sorry, /share hit an error.',
                                    fr: 'Désolé, /share a rencontré une erreur.' ,
                  id: 'Maaf, /share mengalami kesalahan.',
                  ru: 'Извините, при выполнении /share возникла ошибка.',
                  de: 'Entschuldigung, /share ist auf einen Fehler gestoßen.',
                  es: 'Lo sentimos, /share ha dado un error.'
                ,
                  zh: '抱歉，/share 发生错误。',
                  ja: '申し訳ありません、/share エラーが発生しました。',
                  ko: '죄송합니다. /share 실행 중 오류가 발생했습니다.'
                },

  // v0.59.13 — /buddy localisation
  'buddy.on.body':                { en: '👥 *Buddy mode ON.*\n\nWhen you receive Sanctuary picks, a 👥 _Connect_ button appears next to venues where another opted-in soleat user is also heading in the next 60 min. Both of you must confirm before first names + Telegram handles are revealed. Daily cap: 5 connections / 24 h. `/buddy block <chat_id>` to block. `/buddy report <chat_id> <reason>` to flag. `/buddy off` to disable.\n\n⚠ _Pilot — meet only in public, treat as a stranger, trust your gut._',
                                    fr: '👥 *Mode buddy ACTIVÉ.*\n\nLorsque vous recevez des sélections sanctuaires, un bouton 👥 _Connecter_ apparaît à côté des lieux où un autre utilisateur soleat opté-in se rend dans les 60 prochaines minutes. Vous devez tous deux confirmer avant que les prénoms et identifiants Telegram soient révélés. Limite quotidienne : 5 connexions / 24 h. `/buddy block <chat_id>` pour bloquer. `/buddy report <chat_id> <raison>` pour signaler. `/buddy off` pour désactiver.\n\n⚠ _Pilote — rencontrez uniquement en public, traitez comme un inconnu, faites confiance à votre instinct._' ,
                    id: '👥 *Mode Teman AKTIF.*\n\nSaat Anda menerima pilihan Sanctuary, tombol 👥 _Hubungkan_ akan muncul di sebelah tempat-tempat yang juga akan dikunjungi oleh pengguna soleat lain yang telah mendaftar dalam 60 menit berikutnya. Anda berdua harus mengkonfirmasi sebelum nama depan + nama pengguna Telegram ditampilkan. Batas harian: 5 koneksi / 24 jam. `/buddy block <chat_id>` untuk memblokir. `/buddy report <chat_id> <reason>` untuk melaporkan. `/buddy off` untuk menonaktifkan.\n\n⚠ _Pilot — temui hanya di tempat umum, perlakukan seperti orang asing, percayai insting Anda._',
                    ru: '👥 *Режим «Друг» включён.*\n\nКогда вы получаете предложения от Sanctuary, рядом с местами, куда в ближайшие 60 минут направляется другой пользователь Soleat, также включивший этот режим, появляется кнопка 👥 _Подключиться_. Оба должны подтвердить, прежде чем будут показаны имена и ники в Telegram. Дневной лимит: 5 подключений / 24 часа. `/buddy block <chat_id>` для блокировки. `/buddy report <chat_id> <reason>` для жалобы. `/buddy off` для отключения.\n\n⚠ _Пилот — встречайтесь только в общественных местах, относитесь к человеку как к незнакомцу, доверяйте своей интуиции._',
                    de: '👥 *Buddy-Modus EIN.*\n\nWenn Sie Sanctuary-Tipps erhalten, erscheint neben Orten, die ein anderer Soleat-Nutzer innerhalb der nächsten 60 Minuten besucht, ein 👥 „Verbinden“-Button. Sie müssen beide bestätigen, bevor Ihre Vornamen und Telegram-Namen angezeigt werden. Tägliches Limit: 5 Verbindungen / 24 Stunden. `/buddy block <chat_id>` zum Blockieren. `/buddy report <chat_id> <reason>` zum Melden. `/buddy off` zum Deaktivieren.\n\n⚠ _Pilot — treffen Sie sich nur an öffentlichen Orten, behandeln Sie die Person wie eine fremde Person, vertrauen Sie Ihrem Bauchgefühl._',
                    zh: '👥 *好友模式开启*\n\n当您收到 Sanctuary 推荐时，如果另一位已加入的 Soleat 用户也将在接下来的 60 分钟内前往某个地点，该地点旁边会出现一个 👥 _连接_ 按钮。双方必须确认后，才能显示彼此的名字和 Telegram 用户名。每日上限：5 个连接/24 小时。`/buddy block <chat_id>` 屏蔽。`/buddy report <chat_id> <reason>` 举报。`/buddy off` 禁用。\n\n⚠ _试运行功能——只在公共场所见面，像对待陌生人一样对待对方，相信您的直觉。_',
                    ja: '👥 *バディモードON。*\n\nSanctuaryのおすすめを受け取ると、次の60分以内に別のオプトイン済みのSoleatユーザーが向かう予定の場所の横に👥 _接続_ボタンが表示されます。お互いに確認しないと、名前とTelegramのハンドル名が表示されません。1日あたりの上限: 5接続 / 24時間。`/buddy block <chat_id>` でブロック。`/buddy report <chat_id> <reason>` で報告。`/buddy off` で無効にします。\n\n⚠ _試験運用 ― 必ず公共の場所で会い、見知らぬ人のように扱い、自分の直感を信じること。_',
                    es: '👥 *Modo compañero activado.*\n\nCuando recibas recomendaciones de Sanctuary, aparecerá un botón 👥 _Conectar_ junto a los lugares a los que otro usuario de soleat que haya optado por participar también se dirigirá en los próximos 60 minutos. Los dos tenéis que confirmar antes de que se muestren los nombres y los usuarios de Telegram. Límite diario: 5 conexiones / 24 h. `/buddy block <chat_id>` para bloquear. `/buddy report <chat_id> <reason>` para denunciar. `/buddy off` para desactivar.\n\n⚠ _Piloto: queda únicamente en lugares públicos, trata a la otra persona como a un desconocido, confía en tu instinto._',
                    ko: '👥 *버디 모드 켜짐.*\n\nSanctuary 추천을 받으면, 다른 참여 사용자가 앞으로 60분 안에 같은 곳으로 향할 경우 그 옆에 👥 _Connect_ 버튼이 나타납니다. 이름과 텔레그램 아이디는 양쪽이 모두 확인한 뒤에만 공개됩니다. 하루 한도: 24시간당 5회. 차단은 `/buddy block <chat_id>`, 신고는 `/buddy report <chat_id> <reason>`, 해제는 `/buddy off`.\n\n⚠ _시범 운영 — 공공장소에서만 만나고, 낯선 사람으로 대하며, 직감을 믿으세요._'
                  },
  'buddy.off':                    { en: '👥 Buddy mode OFF.', fr: '👥 Mode buddy DÉSACTIVÉ.' ,
                id: '👥 Mode teman MATI.',
                ru: '👥 Режим «Друг» выключен.',
                de: '👥 Buddy-Modus AUS.',
                zh: '👥 好友模式已关闭。',
                ja: '👥 バディモードOFF。',
                es: '👥 Modo compañero DESACTIVADO.',
                ko: '👥 버디 모드 꺼짐.'
              },
  'buddy.block.usage':            { en: 'Usage: `/buddy block <chat_id>`. Get the chat ID from a previous match offer.',
                                    fr: 'Usage : `/buddy block <chat_id>`. Récupérez l\'ID de chat depuis une offre de match précédente.' ,
                        id: 'Penggunaan: `/buddy block <chat_id>`. Dapatkan ID obrolan dari penawaran kecocokan sebelumnya.',
                        ru: 'Использование: `/buddy block <chat_id>`. Идентификатор чата возьмите из предыдущего предложения о встрече.',
                        de: 'Verwendung: `/buddy block <chat_id>`. Die Chat-ID stammt aus einem früheren Match-Angebot.',
                        zh: '用法：`/buddy block <chat_id>`。从之前的匹配邀请中获取聊天 ID。',
                        ja: '使用方法: `/buddy block <chat_id>`。以前のマッチングオファーからチャットIDを取得します。',
                        es: 'Uso: `/buddy block <chat_id>`. Obtén el ID de chat de una oferta de coincidencia anterior.',
                        ko: '사용법: `/buddy block <chat_id>`. chat ID는 이전 매칭 알림에서 확인할 수 있습니다.'
                      },
  'buddy.block.ok':               { en: '🚫 Blocked {target}. They will never be matched with you.',
                                    fr: '🚫 {target} bloqué. Vous ne serez plus jamais associé.' ,
                     id: '🚫 {target} diblokir. Mereka tidak akan pernah dipasangkan dengan Anda.',
                     ru: '🚫 {target} заблокирован. Этот пользователь больше не будет вам предложен.',
                     de: '🚫 Blockiert {target}. Diese Person wird Ihnen niemals zugeordnet werden.',
                     zh: '🚫 已屏蔽{target}。他们永远不会与您匹配。',
                     ja: '🚫 {target}をブロックしました。今後、このユーザーとマッチングされることはありません。',
                     es: '🚫 {target} bloqueado. Nunca se le emparejará contigo.',
                     ko: '🚫 {target} 을(를) 차단했습니다. 앞으로 매칭되지 않습니다.'
                   },
  'buddy.block.cap':              { en: 'Could not block (max 50 blocks reached).',
                                    fr: 'Impossible de bloquer (limite de 50 atteinte).' ,
                      id: 'Tidak dapat memblokir (maksimal 50 pemblokiran tercapai).',
                      ru: 'Не удалось заблокировать (достигнут максимум — 50 блокировок).',
                      de: 'Blockierung fehlgeschlagen (maximal 50 Blöcke erreicht).',
                      zh: '无法屏蔽（已达上限 50 个）。',
                      ja: 'ブロックできませんでした（最大ブロック数50に達しました）。',
                      es: 'No se pudo bloquear (se alcanzó el máximo de 50 bloqueos).',
                      ko: '차단할 수 없습니다 (최대 50개에 도달했습니다).'
                    },
  'buddy.report.usage':           { en: 'Usage: `/buddy report <chat_id> <reason>`.',
                                    fr: 'Usage : `/buddy report <chat_id> <raison>`.' ,
                         id: 'Penggunaan: `/buddy report <chat_id> <reason>`.',
                         ru: 'Использование: `/buddy report <chat_id> <reason>`.',
                         de: 'Verwendung: `/buddy report <chat_id> <reason>`.',
                         zh: '用法：`/buddy report <chat_id> <reason>`。',
                         ja: '使用方法: `/buddy report <chat_id> <reason>`。',
                         es: 'Uso: `/buddy report <chat_id> <reason>`.',
                         ko: '사용법: `/buddy report <chat_id> <reason>`.'
                       },
  'buddy.report.ok':              { en: "📝 Report logged. {target} is also auto-blocked from your matches. We'll review.",
                                    fr: '📝 Signalement enregistré. {target} est aussi auto-bloqué de vos matches. Nous examinerons.' ,
                      id: '📝 Laporan telah dicatat. {target} juga diblokir secara otomatis dari kecocokan Anda. Kami akan meninjaunya.',
                      ru: '📝 Жалоба зарегистрирована. {target} также автоматически исключён из ваших подборок. Мы всё проверим.',
                      de: '📝 Bericht protokolliert. {target} wurde automatisch für Ihre Matches blockiert. Wir prüfen den Vorgang.',
                      zh: '📝 已记录举报。{target}已被自动屏蔽，无法匹配。我们将进行审核。',
                      ja: '📝 報告が記録されました。{target}はマッチング対象から自動的にブロックされます。確認いたします。',
                      es: '📝 Denuncia registrada. {target} también ha sido bloqueado automáticamente de tus coincidencias. Lo revisaremos.',
                      ko: '📝 신고가 접수되었습니다. {target} 은(는) 매칭에서 자동으로 차단됩니다. 검토하겠습니다.'
                    },
  'buddy.status':                 { en: '👥 Buddy mode is currently *{state}*. Today\'s connections: {n}/{cap}. Use `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                                    fr: '👥 Le mode buddy est actuellement *{state}*. Connexions aujourd\'hui : {n}/{cap}. Utilisez `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <raison>`.' ,
                   id: '👥 Mode teman saat ini adalah *{state}*. Koneksi hari ini: {n}/{cap}. Gunakan `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   ru: '👥 Режим "Друг" в данный момент *{state}*. Количество подключений за сегодня: {n}/{cap}. Используйте `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   de: '👥 Der Buddy-Modus ist aktuell *{state}*. Heutige Verbindungen: {n}/{cap}. Verwenden Sie `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.',
                   zh: '👥 好友模式当前处于 *{state}* 状态。今日连接数：{n}/{cap}。使用`/buddy on`、`/buddy off`或`/buddy block <id>`，`/buddy report <id> <reason>`。',
                   es: '👥 El modo compañero está actualmente en *{state}*. Conexiones de hoy: {n}/{cap}. Usa `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>`.'
                 ,
                   ja: '👥 バディモードは現在 *{state}* です。今日の接続: {n}/{cap}。`/buddy on`、`/buddy off`、`/buddy block <id>`、`/buddy report <id> <reason>`を使用してください。',
                   ko: '👥 버디 모드는 현재 *{state}* 입니다. 오늘의 연결: {n}/{cap}. `/buddy on`, `/buddy off`, `/buddy block <id>`, `/buddy report <id> <reason>` 을 사용하세요.'
                 },
  'buddy.status.on':              { en: 'ON', fr: 'ACTIVÉ' ,
                      id: 'AKTIF',
                      ru: 'ВКЛ',
                      de: 'AN',
                      zh: '开启',
                      ja: 'ON',
                      es: 'ACTIVADO',
                      ko: '켜짐'
                    },
  'buddy.status.off':             { en: 'OFF', fr: 'DÉSACTIVÉ' ,
                       id: 'MATI',
                       ru: 'ВЫКЛ',
                       de: 'AUS',
                       zh: '关闭',
                       ja: 'OFF',
                       es: 'DESACTIVADO',
                       ko: '꺼짐'
                     },
  'buddy.error':                  { en: 'Sorry, /buddy hit an error.', fr: 'Désolé, /buddy a rencontré une erreur.' ,
                  id: 'Maaf, /buddy mengalami kesalahan.',
                  ru: 'Извините, /buddy выдал ошибку.',
                  de: 'Entschuldigung, /buddy ist auf einen Fehler gestoßen.',
                  es: 'Lo siento, /buddy ha dado un error.'
                ,
                  zh: '抱歉，/buddy 发生错误。',
                  ja: '申し訳ありません、/buddy エラーが発生しました。',
                  ko: '죄송합니다. /buddy 실행 중 오류가 발생했습니다.'
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
                    es: 'Google Maps ↗',
                    ko: '구글 지도 ↗'
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
                             es: 'Accidente',
                             ko: '사고'
                           },
  'incident.type.MajorAccident':       { en: 'Major Accident', fr: 'Accident grave' ,
                                  id: 'Kecelakaan Besar',
                                  ru: 'Крупная авария',
                                  de: 'Schwerer Unfall',
                                  zh: '重大事故',
                                  ja: '重大事故',
                                  es: 'Accidente grave',
                                  ko: '대형 사고'
                                },
  'incident.type.Roadwork':            { en: 'Roadwork', fr: 'Travaux' ,
                             id: 'Perbaikan jalan',
                             ru: 'Дорожные работы',
                             de: 'Straßenarbeiten',
                             zh: '道路施工',
                             ja: '道路工事',
                             es: 'Obras viales',
                             ko: '도로 공사'
                           },
  'incident.type.RoadWorks':           { en: 'Road Works', fr: 'Travaux' ,
                              id: 'Pekerjaan Jalan',
                              ru: 'Дорожные работы',
                              de: 'Straßenarbeiten',
                              zh: '道路施工',
                              ja: '道路工事',
                              es: 'Obras viales',
                              ko: '도로 공사'
                            },
  'incident.type.VehicleBreakdown':    { en: 'Vehicle Breakdown', fr: 'Véhicule en panne' ,
                                     id: 'Kerusakan Kendaraan',
                                     ru: 'Поломка транспортного средства',
                                     de: 'Fahrzeugpanne',
                                     zh: '车辆故障',
                                     ja: '車両故障',
                                     es: 'Avería del vehículo',
                                     ko: '차량 고장'
                                   },
  'incident.type.HeavyTraffic':        { en: 'Heavy Traffic', fr: 'Trafic dense' ,
                                 id: 'Lalu Lintas Padat',
                                 ru: 'Интенсивное движение',
                                 de: 'Starker Verkehr',
                                 zh: '交通拥堵',
                                 ja: '交通渋滞',
                                 es: 'Tráfico denso',
                                 ko: '정체'
                               },
  'incident.type.Misc':                { en: 'Misc.', fr: 'Incident divers' ,
                         id: 'Lain-lain.',
                         ru: 'Разное.',
                         de: 'Verschiedenes',
                         zh: '杂项',
                         ja: 'その他',
                         es: 'Varios.',
                         ko: '기타'
                       },
  'incident.type.MiscIncident':        { en: 'Miscellaneous', fr: 'Incident divers' ,
                                 id: 'Aneka ragam',
                                 ru: 'Прочее',
                                 de: 'Verschiedenes',
                                 zh: '其他事件',
                                 ja: 'その他',
                                 es: 'Varios',
                                 ko: '기타 상황'
                               },
  'incident.type.Diversion':           { en: 'Diversion', fr: 'Déviation' ,
                              id: 'Pengalihan',
                              ru: 'Объезд',
                              de: 'Umleitung',
                              zh: '改道',
                              ja: '迂回',
                              es: 'Desviación',
                              ko: '우회'
                            },
  'incident.type.UnattendedVehicle':   { en: 'Unattended Vehicle', fr: 'Véhicule abandonné' ,
                                      id: 'Kendaraan Tanpa Pengawasan',
                                      ru: 'Транспортное средство без присмотра',
                                      de: 'Unbeaufsichtigtes Fahrzeug',
                                      zh: '无人看管的车辆',
                                      ja: '無人車両',
                                      es: 'Vehículo desatendido',
                                      ko: '방치 차량'
                                    },
  'incident.type.Obstacle':            { en: 'Obstacle', fr: 'Obstacle' ,
                             id: 'Rintangan',
                             ru: 'Препятствие',
                             de: 'Hindernis',
                             zh: '障碍',
                             ja: '障害物',
                             es: 'Obstáculo',
                             ko: '장애물'
                           },
  'incident.type.RoadBlock':           { en: 'Road Block', fr: 'Route bloquée' ,
                              id: 'Penghalang Jalan',
                              ru: 'Перекрытие дороги',
                              de: 'Straßensperre',
                              zh: '路障',
                              ja: '道路封鎖',
                              es: 'Bloqueo de carretera',
                              ko: '도로 통제'
                            },
  'incident.type.MassDisruption':      { en: 'Mass Disruption', fr: 'Perturbation majeure' ,
                                   id: 'Gangguan Massal',
                                   ru: 'Массовый сбой',
                                   de: 'Großflächige Störung',
                                   zh: '大面积中断',
                                   ja: '大規模な混乱',
                                   es: 'Interrupción generalizada',
                                   ko: '대규모 운행 중단'
                                 },
  'incident.type.Weather':             { en: 'Weather', fr: 'Météo' ,
                            id: 'Cuaca',
                            ru: 'Погода',
                            de: 'Wetter',
                            zh: '天气',
                            ja: '天気',
                            es: 'Clima',
                            ko: '기상'
                          },
  'incident.type.Animals':             { en: 'Animals', fr: 'Animaux' ,
                            id: 'Hewan',
                            ru: 'Животные',
                            de: 'Tiere',
                            zh: '动物',
                            ja: '動物',
                            es: 'Animales',
                            ko: '동물'
                          },
  'incident.type.Incident':            { en: 'Incident', fr: 'Incident' ,
                             id: 'Insiden',
                             ru: 'Инцидент',
                             de: 'Vorfall',
                             zh: '事件',
                             ja: '交通障害',
                             es: 'Incidente',
                             ko: '돌발 상황'
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
                         es: '🍴 Selector de cocina: de Singapur a Johor Bahru',
                         ko: '🍴 Cuisine Picker — 싱가포르에서 조호르바루까지'
                       },
  'cuisine.chat.anchored':        { en: '📍 Anchored to your last shared location.',
                                    fr: '📍 Ancré sur votre dernière position partagée.' ,
                            id: '📍 Ditambatkan ke lokasi terakhir yang Anda bagikan.',
                            ru: '📍 Привязано к последнему местоположению, которым вы поделились.',
                            de: '📍 An Ihrem zuletzt geteilten Standort verankert.',
                            zh: '📍 锚定于您上次共享的位置。',
                            ja: '📍 最後に共有した場所に固定されています。',
                            es: '📍 Anclado a tu última ubicación compartida.',
                            ko: '📍 마지막으로 공유한 위치를 기준으로 합니다.'
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
                                    es: 'Para obtener recomendaciones precisas, primero comparte tu ubicación.',
                                    ko: '정확한 추천을 위해 먼저 위치를 공유해 주세요.'
                                  },
  'cuisine.chat.openWithGps':     { en: '↓',
                                    fr: '↓' ,
                               id: '↓',
                               ru: '↓',
                               de: '↓',
                               zh: '↓',
                               ja: '↓',
                               es: '↓',
                               ko: '↓'
                             },
  'cuisine.chat.openBtn':         { en: '🍴 Open Cuisine Picker', fr: '🍴 Ouvrir le sélecteur' ,
                           id: '🍴 Buka Pemilih Kuliner',
                           ru: '🍴 Открыть «Выбор кухни»',
                           de: '🍴 Küchenauswahl öffnen',
                           zh: '🍴 打开美食选择器',
                           ja: '🍴 料理選択ツールを開く',
                           es: '🍴 Abrir el selector de cocina',
                           ko: '🍴 Cuisine Picker 열기'
                         },
  'cuisine.chat.shareLocBtn':     { en: '📍 Share location with bot', fr: '📍 Partager la position avec le bot' ,
                               id: '📍 Bagikan lokasi dengan bot',
                               ru: '📍 Поделиться местоположением с ботом',
                               de: '📍 Standort mit dem Bot teilen',
                               zh: '📍 与机器人分享位置',
                               ja: '📍 ボットと位置情報を共有',
                               es: '📍 Comparte tu ubicación con el bot',
                               ko: '📍 봇에 위치 공유'
                             },
  'cuisine.chat.openError':       { en: "Sorry, I can't open the Cuisine Picker right now.",
                                    fr: 'Désolé, impossible d’ouvrir le sélecteur de cuisine pour le moment.' ,
                             id: 'Maaf, saya tidak bisa membuka Pemilih Kuliner saat ini.',
                             ru: 'Извините, сейчас не удаётся открыть «Выбор кухни».',
                             de: 'Tut mir leid, ich kann den Küchenauswahl-Assistenten gerade nicht öffnen.',
                             zh: '抱歉，我现在无法打开美食选择器。',
                             ja: '申し訳ありませんが、現在、料理選択ツールを開くことができません。',
                             es: 'Lo siento, no puedo abrir el selector de cocina ahora mismo.',
                             ko: '죄송합니다. 지금은 Cuisine Picker를 열 수 없습니다.'
                           },
  'cuisine.chat.webhookOnly':     { en: "The Cuisine Picker needs the webhook-mode TMA. Try /hidden for chat-based picks instead, or just type 'find me ramen' / similar and I'll search.",
                                    fr: 'Le Sélecteur de cuisine nécessite la TMA en mode webhook. Essayez /hidden pour des choix en chat, ou tapez « trouve-moi des ramen » / similaire et je cherche.' ,
                               id: 'Pemilih Kuliner membutuhkan TMA mode webhook. Coba /hidden untuk pilihan berbasis obrolan, atau ketik saja \'cari ramen untukku\' / serupa dan saya akan mencarinya.',
                               ru: 'Для «Выбора кухни» нужен TMA в режиме веб-хука. Попробуйте /hidden для выбора прямо в чате или просто напишите «find me ramen» или похожее, и я поищу.',
                               de: 'Der Cuisine Picker benötigt den TMA im Webhook-Modus. Verwenden Sie stattdessen /hidden für Chat-basierte Auswahlmöglichkeiten oder geben Sie einfach „find me ramen“ oder Ähnliches ein, und ich suche für Sie.',
                               zh: '美食选择器需要 webhook 模式的 TMA。如果想通过聊天进行选择，请尝试/hidden，或者直接输入“find me ramen”之类的内容，我会帮你搜索。',
                               es: 'El selector de cocina necesita el TMA en modo webhook. Prueba con /hidden para selecciones basadas en chat, o simplemente escribe \'find me ramen\' o similar y lo buscaré.'
                             ,
                               ja: '料理選択ツールにはWebhookモードのTMAが必要です。チャットベースの選択には /hidden をお試しください。または「find me ramen」のように入力していただければ検索します。',
                               ko: 'Cuisine Picker는 웹훅 모드의 TMA가 필요합니다. 대화형 추천은 /hidden 을 이용하시거나, \'find me ramen\' 처럼 입력하시면 검색해 드립니다.'
                             },

  // ── v0.62.859 — THE BOT'S TWO-LOCALE TERNARIES, KEYED ──────────────────────────────
  //
  // Operator, from the outstanding list: "can we do 1, 3, 4, 6". This is item 6.
  //
  // 113 sites across 13 files read `lang === 'fr' ? '…' : '…'` — written when the app had
  // two locales and never revisited when it reached eight. Every one of them served ENGLISH
  // to the six locales added since. Same defect class AMD-59/61 swept out of `web/`; this is
  // the server and bot half, which that pass deliberately left.
  //
  // en and fr below are LIFTED FROM THE TERNARY ARMS BY A SCRIPT, not retyped, so they
  // cannot drift from what shipped. The other six are new.
  //
  // PLACEHOLDERS ARE NAMED, NOT POSITIONAL. AMD-61 measured why: zh and ja reorder slots
  // relative to English, and `{p1}/{p2}` filled by position silently transposes them.
  // Substitution here is by name, so a translation may put the slots wherever its grammar
  // needs them.
  "bot.ratingpref.unratedOnlyBrandNewPlaces": { en: "unrated only (brand-new places)", fr: "sans note (nouveaux lieux uniquement)", id: "tanpa rating saja (tempat baru)", ru: "только без оценок (новые места)", de: "nur ohne Bewertung (ganz neue Orte)", zh: "仅未评分（全新店）", ja: "未評価のみ（新店）", es: "solo sin valoración (sitios nuevos)", ko: "평점 없는 곳만 (완전히 새로 생긴 곳)" },
  "bot.index.yourSharedLocationIsOld": { en: "📍 Your shared location is {age} old. {label} needs a fresher GPS pin (≤ {maxAge} min). Tap the button below to share a new pin, or run \\`/location <place>\\`.", fr: "📍 Votre position partagée date de {age}. {label} a besoin d'un point GPS plus frais (≤ {maxAge} min). Touchez le bouton ci-dessous pour partager une nouvelle position, ou tapez \\`/location <lieu>\\`.", id: "📍 Lokasi yang Anda bagikan sudah {age}. {label} perlu titik GPS yang lebih baru (≤ {maxAge} menit). Ketuk tombol di bawah untuk membagikan titik baru, atau jalankan \\`/location <tempat>\\`.", ru: "📍 Ваша геопозиция отправлена {age} назад. Для {label} нужна более свежая точка GPS (≤ {maxAge} мин). Нажмите кнопку ниже, чтобы отправить новую, или введите \\`/location <место>\\`.", de: "📍 Dein geteilter Standort ist {age} alt. {label} braucht einen frischeren GPS-Punkt (≤ {maxAge} Min). Tippe unten, um einen neuen zu senden, oder nutze \\`/location <Ort>\\`.", zh: "📍 你分享的位置已过去 {age}。{label} 需要更新的 GPS 定位（≤ {maxAge} 分钟）。请点击下方按钮重新分享，或输入 \\`/location <地点>\\`。", ja: "📍 共有された位置情報は{age}前のものです。{label}にはより新しいGPS位置（{maxAge}分以内）が必要です。下のボタンから再送信するか、\\`/location <場所>\\` と入力してください。", es: "📍 Tu ubicación compartida tiene {age}. {label} necesita un punto GPS más reciente (≤ {maxAge} min). Toca el botón de abajo para compartir uno nuevo, o usa \\`/location <lugar>\\`.", ko: "📍 공유하신 위치는 {age} 지난 것입니다. {label}에는 더 최신 GPS 위치(≤ {maxAge}분)가 필요합니다. 아래 버튼을 눌러 새 위치를 공유하시거나 \\`/location <장소>\\` 를 입력하세요." },
  "bot.index.soleatSPicks": { en: "Soleat's {meal} picks", fr: "Sélections de Soleat · {meal}", id: "Pilihan {meal} dari Soleat", ru: "Подборка Soleat · {meal}", de: "Soleats {meal}-Auswahl", zh: "Soleat 的{meal}精选", ja: "Soleatの{meal}のおすすめ", es: "Selección de Soleat · {meal}", ko: "Soleat의 {meal} 추천" },
  "bot.index.noSavedLocation": { en: "no saved location", fr: "aucun lieu enregistré", id: "tidak ada lokasi tersimpan", ru: "нет сохранённого места", de: "kein gespeicherter Ort", zh: "没有已保存的位置", ja: "保存された位置なし", es: "sin ubicación guardada", ko: "저장된 위치 없음" },
  "bot.index.menuUnavailableHostNotConfigured": { en: "⚠️ Menu unavailable (host not configured).", fr: "⚠️ Menu indisponible (hôte non configuré).", id: "⚠️ Menu tidak tersedia (host belum dikonfigurasi).", ru: "⚠️ Меню недоступно (хост не настроен).", de: "⚠️ Menü nicht verfügbar (Host nicht konfiguriert).", zh: "⚠️ 菜单不可用（主机未配置）。", ja: "⚠️ メニューを利用できません（ホスト未設定）。", es: "⚠️ Menú no disponible (host no configurado).", ko: "⚠️ 메뉴를 사용할 수 없습니다 (호스트가 설정되지 않았습니다)." },
  "bot.index.soleatMenuTapToOpen": { en: "🍚 *Soleat Menu* — tap to open.", fr: "🍚 *Soleat Menu* — touchez pour ouvrir.", id: "🍚 *Soleat Menu* — ketuk untuk membuka.", ru: "🍚 *Soleat Menu* — нажмите, чтобы открыть.", de: "🍚 *Soleat Menu* — zum Öffnen tippen.", zh: "🍚 *Soleat Menu* — 点击打开。", ja: "🍚 *Soleat Menu* — タップして開く。", es: "🍚 *Soleat Menu* — toca para abrir.", ko: "🍚 *Soleat 메뉴* — 눌러서 열기." },
  "bot.index.openMenu": { en: "Open menu", fr: "Ouvrir le menu", id: "Buka menu", ru: "Открыть меню", de: "Menü öffnen", zh: "打开菜单", ja: "メニューを開く", es: "Abrir menú", ko: "메뉴 열기" },
  "bot.index.thatPromptHasExpiredShare": { en: "⌛ That prompt has expired. Share your location again to retry.", fr: "⌛ Cette invite est expirée. Réessayez en partageant à nouveau votre position.", id: "⌛ Permintaan itu sudah kedaluwarsa. Bagikan lokasi Anda lagi untuk mencoba ulang.", ru: "⌛ Запрос устарел. Отправьте геопозицию ещё раз, чтобы повторить.", de: "⌛ Diese Anfrage ist abgelaufen. Teile deinen Standort erneut.", zh: "⌛ 该请求已过期。请重新分享位置后再试。", ja: "⌛ このリクエストは期限切れです。位置情報をもう一度共有してください。", es: "⌛ Esa solicitud ha caducado. Comparte tu ubicación de nuevo para reintentar.", ko: "⌛ 해당 안내는 만료되었습니다. 위치를 다시 공유해 주세요." },
  "bot.index.whatNameForClipReply": { en: "✏️ What name for clip {n}? (Reply to this message — 60 chars max.)", fr: "✏️ Quel nom pour le clip {n} ? (Répondez à ce message — 60 caractères max.)", id: "✏️ Nama apa untuk klip {n}? (Balas pesan ini — maksimal 60 karakter.)", ru: "✏️ Как назвать клип {n}? (Ответьте на это сообщение — не более 60 символов.)", de: "✏️ Welcher Name für Clip {n}? (Antworte auf diese Nachricht — max. 60 Zeichen.)", zh: "✏️ 剪辑 {n} 叫什么名字？（回复此消息 — 最多 60 个字符。）", ja: "✏️ クリップ{n}の名前は？（このメッセージに返信 — 60文字まで。）", es: "✏️ ¿Qué nombre para el clip {n}? (Responde a este mensaje — máx. 60 caracteres.)", ko: "✏️ 클립 {n}의 이름을 무엇으로 할까요? (이 메시지에 답장해 주세요 — 최대 60자.)" },
  "bot.index.removeClip": { en: "🗑 Remove clip {n}?", fr: "🗑 Supprimer le clip {n} ?", id: "🗑 Hapus klip {n}?", ru: "🗑 Удалить клип {n}?", de: "🗑 Clip {n} entfernen?", zh: "🗑 删除剪辑 {n}？", ja: "🗑 クリップ{n}を削除しますか？", es: "🗑 ¿Eliminar el clip {n}?", ko: "🗑 클립 {n}을(를) 삭제할까요?" },
  "bot.index.yesRemove": { en: "Yes, remove", fr: "Oui, supprimer", id: "Ya, hapus", ru: "Да, удалить", de: "Ja, entfernen", zh: "是，删除", ja: "はい、削除", es: "Sí, eliminar", ko: "네, 삭제" },
  "bot.index.cancel": { en: "Cancel", fr: "Annuler", id: "Batal", ru: "Отмена", de: "Abbrechen", zh: "取消", ja: "キャンセル", es: "Cancelar", ko: "취소" },
  "bot.index.clipRemoved": { en: "✅ Clip {n} removed.", fr: "✅ Clip {n} supprimé.", id: "✅ Klip {n} dihapus.", ru: "✅ Клип {n} удалён.", de: "✅ Clip {n} entfernt.", zh: "✅ 剪辑 {n} 已删除。", ja: "✅ クリップ{n}を削除しました。", es: "✅ Clip {n} eliminado.", ko: "✅ 클립 {n}을(를) 삭제했습니다." },
  "bot.index.couldnTRemoveTheClip": { en: "❌ Couldn't remove — the clip may no longer exist.", fr: "❌ Échec — le clip n'existe peut-être plus.", id: "❌ Gagal menghapus — klip mungkin sudah tidak ada.", ru: "❌ Не удалось удалить — клипа, возможно, больше нет.", de: "❌ Entfernen fehlgeschlagen — der Clip existiert möglicherweise nicht mehr.", zh: "❌ 删除失败 — 该剪辑可能已不存在。", ja: "❌ 削除できませんでした — クリップが存在しない可能性があります。", es: "❌ No se pudo eliminar — puede que el clip ya no exista.", ko: "❌ 삭제하지 못했습니다 — 해당 클립이 더 이상 없을 수 있습니다." },
  "bot.index.cancelled": { en: "Cancelled.", fr: "Annulé.", id: "Dibatalkan.", ru: "Отменено.", de: "Abgebrochen.", zh: "已取消。", ja: "キャンセルしました。", es: "Cancelado.", ko: "취소되었습니다." },
  "bot.index.clearAllYourClips": { en: "🗑 Clear all your clips?", fr: "🗑 Effacer tous vos clips ?", id: "🗑 Hapus semua klip Anda?", ru: "🗑 Удалить все ваши клипы?", de: "🗑 Alle deine Clips löschen?", zh: "🗑 清空你的所有剪辑？", ja: "🗑 すべてのクリップを消去しますか？", es: "🗑 ¿Borrar todos tus clips?", ko: "🗑 모든 클립을 지울까요?" },
  "bot.index.yesClear": { en: "Yes, clear", fr: "Oui, effacer", id: "Ya, hapus semua", ru: "Да, удалить всё", de: "Ja, alles löschen", zh: "是，全部清空", ja: "はい、すべて消去", es: "Sí, borrar todo", ko: "네, 모두 지우기" },
  "bot.index.allYourClipsHaveBeen": { en: "✅ All your clips have been cleared.", fr: "✅ Tous vos clips ont été effacés.", id: "✅ Semua klip Anda telah dihapus.", ru: "✅ Все ваши клипы удалены.", de: "✅ Alle deine Clips wurden gelöscht.", zh: "✅ 你的所有剪辑已清空。", ja: "✅ すべてのクリップを消去しました。", es: "✅ Se han borrado todos tus clips.", ko: "✅ 모든 클립을 지웠습니다." },
  "bot.index.locationSavedReadyForCuisine": { en: "📍 *Location saved*\\n{place}\\n\\n_Ready for /cuisine, /search, /carpark, /transport._", fr: "📍 *Position enregistrée*\\n{place}\\n\\n_Prête pour /cuisine, /search, /carpark, /transport._", id: "📍 *Lokasi tersimpan*\\n{place}\\n\\n_Siap untuk /cuisine, /search, /carpark, /transport._", ru: "📍 *Место сохранено*\\n{place}\\n\\n_Готово для /cuisine, /search, /carpark, /transport._", de: "📍 *Ort gespeichert*\\n{place}\\n\\n_Bereit für /cuisine, /search, /carpark, /transport._", zh: "📍 *位置已保存*\\n{place}\\n\\n_可用于 /cuisine、/search、/carpark、/transport。_", ja: "📍 *位置を保存しました*\\n{place}\\n\\n_/cuisine、/search、/carpark、/transport で使えます。_", es: "📍 *Ubicación guardada*\\n{place}\\n\\n_Lista para /cuisine, /search, /carpark, /transport._", ko: "📍 *위치를 저장했습니다*\\n{place}\\n\\n_/cuisine, /search, /carpark, /transport 에서 사용할 수 있습니다._" },
  "bot.index.youVeHitTheLimit": { en: "⏳ You've hit the limit of {cap} requests per {b} minutes. Try again in ~{mins} min.", fr: "⏳ Vous avez atteint la limite de {cap} requêtes par {b} minutes. Réessayez dans ~{mins} min.", id: "⏳ Anda mencapai batas {cap} permintaan per {b} menit. Coba lagi dalam ~{mins} menit.", ru: "⏳ Достигнут лимит: {cap} запросов за {b} мин. Повторите примерно через {mins} мин.", de: "⏳ Limit erreicht: {cap} Anfragen pro {b} Minuten. Versuch es in ~{mins} Min erneut.", zh: "⏳ 已达上限：每 {b} 分钟 {cap} 次请求。请约 {mins} 分钟后再试。", ja: "⏳ 上限に達しました（{b}分あたり{cap}回）。約{mins}分後にお試しください。", es: "⏳ Has alcanzado el límite de {cap} solicitudes por {b} minutos. Inténtalo en ~{mins} min.", ko: "⏳ {b}분당 {cap}회 요청 한도에 도달했습니다. 약 {mins}분 후에 다시 시도해 주세요." },
  "bot.index.yourTelegramClientIsIn": { en: "\\n\\nℹ️ Your Telegram client is in {a} but the bot is replying in {b}. Type \\`/language auto\\` to follow your Telegram client locale automatically.", fr: "\\n\\nℹ️ Votre Telegram est en {a} mais le bot répond en {b}. Tapez \\`/language auto\\` pour suivre la langue de votre Telegram automatiquement.", id: "\\n\\nℹ️ Telegram Anda berbahasa {a}, tetapi bot menjawab dalam {b}. Ketik \\`/language auto\\` agar bot mengikuti bahasa Telegram Anda secara otomatis.", ru: "\\n\\nℹ️ Ваш Telegram на языке {a}, а бот отвечает на {b}. Введите \\`/language auto\\`, чтобы бот следовал языку Telegram.", de: "\\n\\nℹ️ Dein Telegram ist auf {a}, der Bot antwortet aber auf {b}. Tippe \\`/language auto\\`, damit der Bot deiner Telegram-Sprache folgt.", zh: "\\n\\nℹ️ 你的 Telegram 语言是{a}，但机器人回复用的是{b}。输入 \\`/language auto\\` 可自动跟随 Telegram 的语言。", ja: "\\n\\nℹ️ Telegramの言語は{a}ですが、ボットは{b}で応答しています。\\`/language auto\\` と入力すると、Telegramの言語に自動で合わせます。", es: "\\n\\nℹ️ Tu Telegram está en {a} pero el bot responde en {b}. Escribe \\`/language auto\\` para seguir el idioma de tu Telegram automáticamente.", ko: "\\n\\nℹ️ 텔레그램 언어는 {a}이지만 봇은 {b}(으)로 응답하고 있습니다. \\`/language auto\\` 를 입력하면 텔레그램 언어를 자동으로 따릅니다." },
  "bot.index.looksLikeACuisineOr": { en: "🍽 _\"{term}\"_ looks like a cuisine or dish. For a food search, use \\`/s {term}\\`. \\`/hidden\\` is for searching around a *place*.\\n\\n", fr: "🍽 _\"{term}\"_ semble être une cuisine ou un plat. Pour une recherche culinaire, utilisez \\`/s {term}\\`. \\`/hidden\\` cherche autour d'un *lieu*.\\n\\n", id: "🍽 _\\\"{term}\\\"_ tampak seperti masakan atau hidangan. Untuk mencari makanan, gunakan \\`/s {term}\\`. \\`/hidden\\` mencari di sekitar sebuah *tempat*.\\n\\n", ru: "🍽 _\\\"{term}\\\"_ похоже на кухню или блюдо. Для поиска еды используйте \\`/s {term}\\`. \\`/hidden\\` ищет вокруг *места*.\\n\\n", de: "🍽 _\\\"{term}\\\"_ klingt nach einer Küche oder einem Gericht. Für die Essenssuche nutze \\`/s {term}\\`. \\`/hidden\\` sucht rund um einen *Ort*.\\n\\n", zh: "🍽 _\\\"{term}\\\"_ 看起来是菜系或菜名。搜索美食请用 \\`/s {term}\\`。\\`/hidden\\` 用于在某个*地点*周边搜索。\\n\\n", ja: "🍽 _\\\"{term}\\\"_ は料理ジャンルか料理名のようです。food検索には \\`/s {term}\\` を使ってください。\\`/hidden\\` は*場所*の周辺を探すコマンドです。\\n\\n", es: "🍽 _\\\"{term}\\\"_ parece una cocina o un plato. Para buscar comida usa \\`/s {term}\\`. \\`/hidden\\` busca alrededor de un *lugar*.\\n\\n", ko: "🍽 _\\\"{term}\\\"_ 은(는) 요리 종류나 음식 이름으로 보입니다. 음식 검색에는 \\`/s {term}\\` 을 사용하세요. \\`/hidden\\` 은 *장소* 주변을 찾는 명령입니다.\\n\\n" },
  "bot.index.iCouldnTRecogniseAs": { en: "{a}I couldn't recognise \"{text}\" as a place. Please give a street name, building, or MRT station — e.g. \\`/hidden Tanjong Pagar MRT\\` or \\`/hidden Orchard Road\\`. Johor Bahru is also accepted.", fr: "{a}Je n'ai pas trouvé \"{text}\" comme lieu. Indiquez un nom de rue, un bâtiment ou une station MRT — ex. \\`/hidden Tanjong Pagar MRT\\` ou \\`/hidden Orchard Road\\`. Johor Bahru est aussi accepté.", id: "{a}Saya tidak mengenali \\\"{text}\\\" sebagai sebuah tempat. Berikan nama jalan, gedung, atau stasiun MRT — mis. \\`/hidden Tanjong Pagar MRT\\` atau \\`/hidden Orchard Road\\`. Johor Bahru juga diterima.", ru: "{a}Не удалось распознать \\\"{text}\\\" как место. Укажите улицу, здание или станцию MRT — например \\`/hidden Tanjong Pagar MRT\\` или \\`/hidden Orchard Road\\`. Джохор-Бару тоже подходит.", de: "{a}Ich konnte \\\"{text}\\\" nicht als Ort erkennen. Gib eine Straße, ein Gebäude oder eine MRT-Station an — z. B. \\`/hidden Tanjong Pagar MRT\\` oder \\`/hidden Orchard Road\\`. Johor Bahru geht auch.", zh: "{a}无法把 \\\"{text}\\\" 识别为地点。请提供街道名、建筑或地铁站 — 例如 \\`/hidden Tanjong Pagar MRT\\` 或 \\`/hidden Orchard Road\\`。新山（Johor Bahru）也可以。", ja: "{a}\\\"{text}\\\" を場所として認識できませんでした。通り名・建物・MRT駅などを指定してください — 例：\\`/hidden Tanjong Pagar MRT\\` や \\`/hidden Orchard Road\\`。ジョホールバルも利用できます。", es: "{a}No pude reconocer \\\"{text}\\\" como un lugar. Indica una calle, un edificio o una estación de MRT — p. ej. \\`/hidden Tanjong Pagar MRT\\` o \\`/hidden Orchard Road\\`. Johor Bahru también vale.", ko: "{a}\"{text}\" 을(를) 장소로 인식하지 못했습니다. 도로명, 건물명 또는 MRT 역을 입력해 주세요 — 예: \\`/hidden Tanjong Pagar MRT\\` 또는 \\`/hidden Orchard Road\\`. 조호르바루도 가능합니다." },
  "bot.index.searchingAround200M3": { en: "🔍 Searching around *{place}* (200 m – 3 km)…", fr: "🔍 Recherche autour de *{place}* (200 m – 3 km)…", id: "🔍 Mencari di sekitar *{place}* (200 m – 3 km)…", ru: "🔍 Ищу рядом с *{place}* (200 м – 3 км)…", de: "🔍 Suche rund um *{place}* (200 m – 3 km)…", zh: "🔍 正在 *{place}* 周边搜索（200 米 – 3 公里）…", ja: "🔍 *{place}* の周辺を検索中（200 m〜3 km）…", es: "🔍 Buscando cerca de *{place}* (200 m – 3 km)…", ko: "🔍 *{place}* 주변을 검색하는 중 (200m – 3km)…" },
  "bot.index.viewAllPicksOnOne": { en: "🗺 View all {count} picks on one map:", fr: "🗺 Voir les {count} trouvailles sur une carte :", id: "🗺 Lihat semua {count} pilihan di satu peta:", ru: "🗺 Показать все {count} мест на одной карте:", de: "🗺 Alle {count} Treffer auf einer Karte:", zh: "🗺 在一张地图上查看全部 {count} 个推荐：", ja: "🗺 {count}件すべてを1つの地図で見る：", es: "🗺 Ver los {count} sitios en un mapa:", ko: "🗺 추천 {count}곳을 한 지도에서 보기:" },
  "bot.index.openOnMap": { en: "🗺 Open {count} on map", fr: "🗺 Voir les {count} sur la carte", id: "🗺 Buka {count} di peta", ru: "🗺 Открыть {count} на карте", de: "🗺 {count} auf der Karte", zh: "🗺 在地图查看 {count} 个", ja: "🗺 地図で{count}件を見る", es: "🗺 Ver {count} en el mapa", ko: "🗺 지도에서 {count}곳 열기" },
  "bot.index.iGeminiFoundCandidatesValidating": { en: "✓ <i>Gemini found {count} candidates · validating via Google Places…</i>", fr: "✓ <i>Gemini a trouvé {count} candidats · validation en cours via Google Places…</i>", id: "✓ <i>Gemini menemukan {count} kandidat · memvalidasi lewat Google Places…</i>", ru: "✓ <i>Gemini нашёл {count} кандидатов · проверка через Google Places…</i>", de: "✓ <i>Gemini hat {count} Kandidaten gefunden · Prüfung über Google Places…</i>", zh: "✓ <i>Gemini 找到 {count} 个候选 · 正在通过 Google Places 验证…</i>", ja: "✓ <i>Geminiが{count}件の候補を発見 · Google Placesで検証中…</i>", es: "✓ <i>Gemini encontró {count} candidatos · validando vía Google Places…</i>", ko: "✓ <i>Gemini가 후보 {count}곳을 찾았습니다 · Google Places로 확인 중…</i>" },
  "bot.index.iVenueVerifiedWithinRadius": { en: "✓ <i>{a} venue{b} verified within radius · ranking by distance…</i>", fr: "✓ <i>{a} candidat{b} dans le rayon · classement par distance…</i>", id: "✓ <i>{a} tempat terverifikasi dalam radius · mengurutkan berdasarkan jarak…</i>", ru: "✓ <i>{a} мест подтверждено в радиусе · сортировка по расстоянию…</i>", de: "✓ <i>{a} Lokale im Radius bestätigt · Sortierung nach Entfernung…</i>", zh: "✓ <i>半径内已验证 {a} 家 · 正在按距离排序…</i>", ja: "✓ <i>範囲内で{a}件を確認 · 距離順に並べ替え中…</i>", es: "✓ <i>{a} locales verificado dentro del radio · ordenando por distancia…</i>", ko: "✓ <i>반경 내에서 {a}곳{b}을 확인했습니다 · 거리순으로 정렬 중…</i>" },
  "bot.index.iWideningTo15": { en: "↻ <i>Widening to 1.5–3 km…</i>", fr: "↻ <i>Élargissement à 1.5–3 km…</i>", id: "↻ <i>Memperluas ke 1,5–3 km…</i>", ru: "↻ <i>Расширяю до 1,5–3 км…</i>", de: "↻ <i>Erweitere auf 1,5–3 km…</i>", zh: "↻ <i>扩大到 1.5–3 公里…</i>", ja: "↻ <i>1.5〜3 kmに範囲を拡大中…</i>", es: "↻ <i>Ampliando a 1,5–3 km…</i>", ko: "↻ <i>1.5–3km로 범위를 넓히는 중…</i>" },
  "bot.index.iWiderClaudeWebSearch": { en: "↻ <i>Wider Claude web search (up to 90 s)…</i>", fr: "↻ <i>Recherche élargie via Claude (jusqu\\'à 90 s)…</i>", id: "↻ <i>Pencarian web Claude yang lebih luas (hingga 90 dtk)…</i>", ru: "↻ <i>Расширенный веб-поиск Claude (до 90 с)…</i>", de: "↻ <i>Erweiterte Claude-Websuche (bis zu 90 s)…</i>", zh: "↻ <i>更大范围的 Claude 网络搜索（最长 90 秒）…</i>", ja: "↻ <i>Claudeによる広域ウェブ検索（最大90秒）…</i>", es: "↻ <i>Búsqueda web ampliada con Claude (hasta 90 s)…</i>", ko: "↻ <i>더 넓은 Claude 웹 검색 (최대 90초)…</i>" },
  "bot.index.noClipAtThatIndex": { en: "❓ No clip at that index.", fr: "❓ Aucun clip à cet emplacement.", id: "❓ Tidak ada klip pada indeks itu.", ru: "❓ По этому номеру клипа нет.", de: "❓ Kein Clip an dieser Position.", zh: "❓ 该编号没有剪辑。", ja: "❓ その番号のクリップはありません。", es: "❓ No hay ningún clip en ese índice.", ko: "❓ 해당 번호의 클립이 없습니다." },
  "bot.index.openSketchbook": { en: "📋 Open Sketchbook", fr: "📋 Ouvrir Sketchbook", id: "📋 Buka Sketchbook", ru: "📋 Открыть Sketchbook", de: "📋 Sketchbook öffnen", zh: "📋 打开 Sketchbook", ja: "📋 Sketchbookを開く", es: "📋 Abrir Sketchbook", ko: "📋 Sketchbook 열기" },
  "bot.index.noClipsMatching": { en: "📋 No clips matching \"{cuisine}\".", fr: "📋 Aucun clip pour « {cuisine} ».", id: "📋 Tidak ada klip untuk \\\"{cuisine}\\\".", ru: "📋 Нет клипов по запросу «{cuisine}».", de: "📋 Keine Clips für „{cuisine}“.", zh: "📋 没有匹配 \\\"{cuisine}\\\" 的剪辑。", ja: "📋 「{cuisine}」に一致するクリップはありません。", es: "📋 No hay clips para «{cuisine}».", ko: "📋 \"{cuisine}\" 에 해당하는 클립이 없습니다." },
  "bot.index.noClipsYetTapCopy": { en: "📋 No clips yet. Tap Copy in the cuisine picker, or open Sketchbook.", fr: "📋 Vous n\\'avez pas encore de clips. Touchez « Copier » dans le sélecteur, ou ouvrez Sketchbook.", id: "📋 Belum ada klip. Ketuk Salin di pemilih masakan, atau buka Sketchbook.", ru: "📋 Клипов пока нет. Нажмите «Копировать» в выборе кухни или откройте Sketchbook.", de: "📋 Noch keine Clips. Tippe im Küchen-Picker auf Kopieren oder öffne Sketchbook.", zh: "📋 还没有剪辑。在菜系选择器中点「复制」，或打开 Sketchbook。", ja: "📋 まだクリップがありません。料理ピッカーの「コピー」をタップするか、Sketchbookを開いてください。", es: "📋 Aún no hay clips. Toca Copiar en el selector de cocina, o abre Sketchbook.", ko: "📋 아직 클립이 없습니다. Cuisine Picker에서 복사를 누르거나 Sketchbook을 열어 보세요." },
  "bot.index.yourLastClips": { en: "📋 Your last clips · \"{cuisine}\"", fr: "📋 Vos derniers clips · « {cuisine} »", id: "📋 Klip terakhir Anda · \\\"{cuisine}\\\"", ru: "📋 Ваши последние клипы · «{cuisine}»", de: "📋 Deine letzten Clips · „{cuisine}“", zh: "📋 你最近的剪辑 · \\\"{cuisine}\\\"", ja: "📋 最近のクリップ · 「{cuisine}」", es: "📋 Tus últimos clips · «{cuisine}»", ko: "📋 최근 클립 · \"{cuisine}\"" },
  "bot.index.yourLastClips2": { en: "📋 Your last clips", fr: "📋 Vos derniers clips", id: "📋 Klip terakhir Anda", ru: "📋 Ваши последние клипы", de: "📋 Deine letzten Clips", zh: "📋 你最近的剪辑", ja: "📋 最近のクリップ", es: "📋 Tus últimos clips", ko: "📋 최근 클립" },
  "bot.index.noCuisine": { en: "— no cuisine —", fr: "— pas de cuisine —", id: "— tanpa masakan —", ru: "— без кухни —", de: "— keine Küche —", zh: "— 无菜系 —", ja: "— ジャンルなし —", es: "— sin cocina —", ko: "— 요리 종류 없음 —" },
  "bot.index.venue": { en: "venue", fr: "lieu", id: "tempat", ru: "место", de: "Lokal", zh: "家", ja: "件", es: "local", ko: "곳" },
  "bot.index.venues": { en: "venues", fr: "lieux", id: "tempat", ru: "мест", de: "Lokale", zh: "家", ja: "件", es: "locales", ko: "곳" },
  "bot.index.totalShowingFirst": { en: "{total} total · showing first {count}.", fr: "Voir plus : {total} clips au total.", id: "{total} total · menampilkan {count} pertama.", ru: "Всего {total} · показаны первые {count}.", de: "{total} insgesamt · zeige die ersten {count}.", zh: "共 {total} 条 · 显示前 {count} 条。", ja: "全{total}件 · 最初の{count}件を表示。", es: "{total} en total · mostrando los primeros {count}.", ko: "총 {total}곳 · 처음 {count}곳을 표시합니다." },
  "bot.index.minAgo": { en: "{n} min ago", fr: "il y a {n} min", id: "{n} mnt lalu", ru: "{n} мин назад", de: "vor {n} Min", zh: "{n} 分钟前", ja: "{n}分前", es: "hace {n} min", ko: "{n}분 전" },
  "bot.index.hAgo": { en: "{n} h ago", fr: "il y a {n} h", id: "{n} jam lalu", ru: "{n} ч назад", de: "vor {n} Std", zh: "{n} 小时前", ja: "{n}時間前", es: "hace {n} h", ko: "{n}시간 전" },
  "bot.index.dAgo": { en: "{n} d ago", fr: "il y a {n} j", id: "{n} hr lalu", ru: "{n} дн назад", de: "vor {n} T", zh: "{n} 天前", ja: "{n}日前", es: "hace {n} d", ko: "{n}일 전" },
  "bot.index.wAgo": { en: "{n} w ago", fr: "il y a {n} sem", id: "{n} mgg lalu", ru: "{n} нед назад", de: "vor {n} Wo", zh: "{n} 周前", ja: "{n}週間前", es: "hace {n} sem", ko: "{n}주 전" },
  "bot.index.searchAssistanceWhatWouldYou": { en: "🔎 *Search Assistance*\\n\\nWhat would you like to explore?", fr: "🔎 *Assistance recherche*\\n\\nQue voulez-vous explorer ?", id: "🔎 *Bantuan Pencarian*\\n\\nApa yang ingin Anda jelajahi?", ru: "🔎 *Помощь с поиском*\\n\\nЧто хотите найти?", de: "🔎 *Suchhilfe*\\n\\nWas möchtest du entdecken?", zh: "🔎 *搜索助手*\\n\\n想探索什么？", ja: "🔎 *検索アシスタント*\\n\\n何を探しますか？", es: "🔎 *Asistencia de búsqueda*\\n\\n¿Qué quieres explorar?", ko: "🔎 *검색 도우미*\\n\\n무엇을 찾아볼까요?" },
  "bot.index.authenticDishes": { en: "🍛 Authentic Dishes", fr: "🍛 Plats authentiques", id: "🍛 Hidangan Autentik", ru: "🍛 Аутентичные блюда", de: "🍛 Authentische Gerichte", zh: "🍛 地道菜肴", ja: "🍛 本場の料理", es: "🍛 Platos auténticos", ko: "🍛 정통 요리" },
  "bot.index.othersFreeText": { en: "💡 Others (free text)", fr: "💡 Autres (texte libre)", id: "💡 Lainnya (teks bebas)", ru: "💡 Другое (свободный текст)", de: "💡 Sonstiges (Freitext)", zh: "💡 其他（自由输入）", ja: "💡 その他（自由入力）", es: "💡 Otros (texto libre)", ko: "💡 기타 (직접 입력)" },
  "bot.index.back": { en: "↩ Back", fr: "↩ Retour", id: "↩ Kembali", ru: "↩ Назад", de: "↩ Zurück", zh: "↩ 返回", ja: "↩ 戻る", es: "↩ Atrás", ko: "↩ 뒤로" },
  "bot.index.cookingMethodsPickACuisine": { en: "🥘 *Cooking Methods*\\n\\nPick a cuisine:", fr: "🥘 *Méthodes de cuisson*\\n\\nChoisissez une cuisine :", id: "🥘 *Metode Memasak*\\n\\nPilih masakan:", ru: "🥘 *Способы приготовления*\\n\\nВыберите кухню:", de: "🥘 *Zubereitungsarten*\\n\\nWähle eine Küche:", zh: "🥘 *烹饪方法*\\n\\n选择菜系：", ja: "🥘 *調理法*\\n\\n料理ジャンルを選択：", es: "🥘 *Métodos de cocción*\\n\\nElige una cocina:", ko: "🥘 *조리법*\\n\\n요리 종류를 고르세요:" },
  "bot.index.authenticDishesPickACuisine": { en: "🍛 *Authentic Dishes*\\n\\nPick a cuisine:", fr: "🍛 *Plats authentiques*\\n\\nChoisissez une cuisine :", id: "🍛 *Hidangan Autentik*\\n\\nPilih masakan:", ru: "🍛 *Аутентичные блюда*\\n\\nВыберите кухню:", de: "🍛 *Authentische Gerichte*\\n\\nWähle eine Küche:", zh: "🍛 *地道菜肴*\\n\\n选择菜系：", ja: "🍛 *本場の料理*\\n\\n料理ジャンルを選択：", es: "🍛 *Platos auténticos*\\n\\nElige una cocina:", ko: "🍛 *정통 요리*\\n\\n요리 종류를 고르세요:" },
  "bot.index.unknownCuisineOrNoMethods": { en: "❌ Unknown cuisine or no methods listed.", fr: "❌ Cuisine inconnue ou aucune méthode listée.", id: "❌ Masakan tidak dikenal atau tidak ada metode terdaftar.", ru: "❌ Неизвестная кухня или нет способов приготовления.", de: "❌ Unbekannte Küche oder keine Methoden gelistet.", zh: "❌ 未知菜系，或未列出烹饪方法。", ja: "❌ 不明なジャンル、または調理法が未登録です。", es: "❌ Cocina desconocida o sin métodos listados.", ko: "❌ 알 수 없는 요리 종류이거나 등록된 조리법이 없습니다." },
  "bot.index.cookingMethodsTechniquesListedType": { en: "🥘 *{flag} {cuisine} — cooking methods*\\n\\n{count} techniques listed. Type \\`/s <method>\\` to find Singapore eateries that use one.\\n", fr: "🥘 *{flag} {cuisine} — méthodes de cuisson*\\n\\n{count} techniques répertoriées. Tapez \\`/s <méthode>\\` pour rechercher des établissements à Singapour qui en utilisent une.\\n", id: "🥘 *{flag} {cuisine} — metode memasak*\\n\\n{count} teknik terdaftar. Ketik \\`/s <metode>\\` untuk mencari tempat makan di Singapura yang memakainya.\\n", ru: "🥘 *{flag} {cuisine} — способы приготовления*\\n\\nВ списке {count} техник. Введите \\`/s <способ>\\`, чтобы найти заведения в Сингапуре, где их применяют.\\n", de: "🥘 *{flag} {cuisine} — Zubereitungsarten*\\n\\n{count} Techniken gelistet. Tippe \\`/s <Methode>\\`, um Lokale in Singapur zu finden, die sie nutzen.\\n", zh: "🥘 *{flag} {cuisine} — 烹饪方法*\\n\\n共列出 {count} 种技法。输入 \\`/s <方法>\\` 可查找新加坡使用该技法的餐馆。\\n", ja: "🥘 *{flag} {cuisine} — 調理法*\\n\\n{count}種類の技法を掲載。\\`/s <技法>\\` と入力すると、それを使うシンガポールの店を探せます。\\n", es: "🥘 *{flag} {cuisine} — métodos de cocción*\\n\\n{count} técnicas listadas. Escribe \\`/s <método>\\` para encontrar locales en Singapur que las usen.\\n", ko: "🥘 *{flag} {cuisine} — 조리법*\\n\\n{count}가지 기법이 있습니다. \\`/s <조리법>\\` 을 입력하면 그 기법을 쓰는 싱가포르의 식당을 찾을 수 있습니다.\\n" },
  "bot.index.tipCombineForRicherSearches": { en: "\\n\\n💡 _Tip — combine for richer searches: type_ `/s <dish> <cooking method> <anything>`", fr: "\\n\\n💡 _Astuce — combinez pour des recherches plus riches : tapez_ `/s <plat> <méthode> <autre>`", id: "\\n\\n💡 _Tips — gabungkan untuk pencarian lebih kaya: ketik_ `/s <hidangan> <metode masak> <apa saja>`", ru: "\\n\\n💡 _Совет — комбинируйте для более точного поиска: введите_ `/s <блюдо> <способ> <что угодно>`", de: "\\n\\n💡 _Tipp — kombiniere für reichere Suchen: tippe_ `/s <Gericht> <Methode> <beliebig>`", zh: "\\n\\n💡 _提示 — 组合搜索更精准：输入_ `/s <菜名> <烹饪方法> <任意词>`", ja: "\\n\\n💡 _ヒント — 組み合わせるとより豊かな検索に：_ `/s <料理> <調理法> <任意>`", es: "\\n\\n💡 _Consejo — combina para búsquedas más ricas: escribe_ `/s <plato> <método> <lo que sea>`", ko: "\\n\\n💡 _팁 — 조합하면 더 정확하게 찾을 수 있습니다:_ `/s <요리> <조리법> <무엇이든>`" },
  "bot.index.pickAnotherCuisine": { en: "↩ Pick another cuisine", fr: "↩ Choisir une autre cuisine", id: "↩ Pilih masakan lain", ru: "↩ Выбрать другую кухню", de: "↩ Andere Küche wählen", zh: "↩ 选择其他菜系", ja: "↩ 別のジャンルを選ぶ", es: "↩ Elegir otra cocina", ko: "↩ 다른 요리 종류 고르기" },
  "bot.index.menu": { en: "↩ Menu", fr: "↩ Menu", id: "↩ Menu", ru: "↩ Меню", de: "↩ Menü", zh: "↩ 菜单", ja: "↩ メニュー", es: "↩ Menú", ko: "↩ 메뉴" },
  "bot.index.unknownCuisineOrNoDishes": { en: "❌ Unknown cuisine or no dishes listed.", fr: "❌ Cuisine inconnue ou aucun plat répertorié.", id: "❌ Masakan tidak dikenal atau tidak ada hidangan terdaftar.", ru: "❌ Неизвестная кухня или блюда не указаны.", de: "❌ Unbekannte Küche oder keine Gerichte gelistet.", zh: "❌ 未知菜系，或未列出菜肴。", ja: "❌ 不明なジャンル、または料理が未登録です。", es: "❌ Cocina desconocida o sin platos listados.", ko: "❌ 알 수 없는 요리 종류이거나 등록된 요리가 없습니다." },
  "bot.index.byDishType": { en: "by dish type", fr: "par type de plat", id: "menurut jenis hidangan", ru: "по типу блюда", de: "nach Gerichtsart", zh: "按菜品类型", ja: "料理の種類順", es: "por tipo de plato", ko: "요리 종류순" },
  "bot.index.byNationality": { en: "by nationality", fr: "par nationalité", id: "menurut kebangsaan", ru: "по национальности", de: "nach Nationalität", zh: "按国别", ja: "国・地域順", es: "por nacionalidad", ko: "국가순" },
  "bot.index.authenticDishesSort": { en: "🍛 *{flag} {cuisine} — authentic dishes*\\n_Sort: {sort}_\\n", fr: "🍛 *{flag} {cuisine} — plats authentiques*\\n_Tri : {sort}_\\n", id: "🍛 *{flag} {cuisine} — hidangan autentik*\\n_Urut: {sort}_\\n", ru: "🍛 *{flag} {cuisine} — аутентичные блюда*\\n_Сортировка: {sort}_\\n", de: "🍛 *{flag} {cuisine} — authentische Gerichte*\\n_Sortierung: {sort}_\\n", zh: "🍛 *{flag} {cuisine} — 地道菜肴*\\n_排序：{sort}_\\n", ja: "🍛 *{flag} {cuisine} — 本場の料理*\\n_並び順：{sort}_\\n", es: "🍛 *{flag} {cuisine} — platos auténticos*\\n_Orden: {sort}_\\n", ko: "🍛 *{flag} {cuisine} — 정통 요리*\\n_정렬: {sort}_\\n" },
  "bot.index.freeTextSearchUseS": { en: "💡 *Free-text search*\\n\\nUse `/s <text>` to search for eateries by food, ingredient, cooking style, cooking method, or food-related words.\\n\\nExamples\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nNote: Search results may vary and may not always be exact. Please call the eatery or open its Google Maps link to confirm before going.", fr: "💡 *Recherche en texte libre*\\n\\nUtilisez `/s <texte>` pour rechercher des établissements par plat, ingrédient, style de cuisine, méthode de cuisson ou mots liés à la nourriture.\\n\\nExemples\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nNote : les résultats peuvent varier et ne sont pas toujours exacts. Veuillez appeler l\\'établissement ou ouvrir son lien Google Maps pour confirmer avant de vous déplacer.", id: "💡 *Pencarian teks bebas*\\n\\nGunakan `/s <teks>` untuk mencari tempat makan berdasarkan makanan, bahan, gaya memasak, metode memasak, atau kata terkait makanan.\\n\\nContoh\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nCatatan: hasil pencarian dapat bervariasi dan tidak selalu tepat. Silakan telepon tempat makan atau buka tautan Google Maps-nya untuk memastikan sebelum berangkat.", ru: "💡 *Поиск свободным текстом*\\n\\nИспользуйте `/s <текст>`, чтобы искать заведения по блюду, ингредиенту, стилю или способу приготовления либо другим словам о еде.\\n\\nПримеры\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nПримечание: результаты могут отличаться и не всегда точны. Позвоните в заведение или откройте его ссылку на Google Maps, чтобы убедиться перед поездкой.", de: "💡 *Freitext-Suche*\\n\\nNutze `/s <Text>`, um Lokale nach Gericht, Zutat, Kochstil, Zubereitungsart oder anderen Essensbegriffen zu suchen.\\n\\nBeispiele\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nHinweis: Ergebnisse können variieren und sind nicht immer exakt. Ruf das Lokal an oder öffne seinen Google-Maps-Link, um es vor dem Losfahren zu bestätigen.", zh: "💡 *自由文本搜索*\\n\\n使用 `/s <文字>` 按菜品、食材、烹饪风格、烹饪方法或其他与食物相关的词搜索餐馆。\\n\\n示例\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\n注意：搜索结果可能有出入，不一定准确。出发前请致电餐馆或打开其 Google 地图链接确认。", ja: "💡 *フリーテキスト検索*\\n\\n`/s <テキスト>` で、料理・食材・調理スタイル・調理法など食に関する語から店を検索できます。\\n\\n例\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\n注意：検索結果は変動することがあり、常に正確とは限りません。出かける前に店に電話するか、Googleマップのリンクを開いてご確認ください。", es: "💡 *Búsqueda de texto libre*\\n\\nUsa `/s <texto>` para buscar locales por plato, ingrediente, estilo de cocina, método de cocción o palabras relacionadas con la comida.\\n\\nEjemplos\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\nNota: los resultados pueden variar y no siempre son exactos. Llama al local o abre su enlace de Google Maps para confirmar antes de ir.", ko: "💡 *직접 입력 검색*\\n\\n`/s <검색어>` 로 음식, 재료, 조리 방식, 조리법 또는 음식 관련 단어로 식당을 찾을 수 있습니다.\\n\\n예시\\n• `/s Goulash dumpling`\\n• `/s Braisage French`\\n• `/s En Croute`\\n• `/s Agemono Japanese`\\n\\n참고: 검색 결과는 달라질 수 있으며 항상 정확하지는 않습니다. 방문 전에 식당에 전화하거나 구글 지도 링크를 열어 확인해 주세요." },
  "bot.index.searchConversationEndedSeeYou": { en: "✅ /search conversation ended. See you next time.", fr: "✅ Conversation `/search` terminée. À bientôt.", id: "✅ Percakapan /search selesai. Sampai jumpa lagi.", ru: "✅ Диалог /search завершён. До встречи.", de: "✅ /search-Unterhaltung beendet. Bis zum nächsten Mal.", zh: "✅ /search 对话已结束。下次见。", ja: "✅ /search の会話を終了しました。またどうぞ。", es: "✅ Conversación /search finalizada. Hasta la próxima.", ko: "✅ /search 대화를 종료했습니다. 다음에 또 만나요." },
  "bot.index.searchingForEateriesRelatedTo": { en: "Searching for eateries related to {text}. Please wait a moment.", fr: "Recherche d'établissements liés à « {text} ». Patientez un instant.", id: "Mencari tempat makan terkait {text}. Mohon tunggu sebentar.", ru: "Ищу заведения по запросу {text}. Подождите немного.", de: "Suche Lokale zu {text}. Einen Moment bitte.", zh: "正在搜索与 {text} 相关的餐馆。请稍候。", ja: "{text} に関連する飲食店を検索中です。少々お待ちください。", es: "Buscando locales relacionados con {text}. Espera un momento.", ko: "{text} 관련 식당을 검색하고 있습니다. 잠시만 기다려 주세요." },
  "bot.index.sorryTheSearchForFailed": { en: "Sorry, the search for \"{text}\" failed. Try again in a moment, or reword it with a dish / ingredient name.", fr: "Désolé, la recherche pour « {text} » a échoué. Réessayez dans un instant, ou reformulez avec un nom de plat / d'ingrédient.", id: "Maaf, pencarian untuk \\\"{text}\\\" gagal. Coba lagi sebentar lagi, atau ubah kata dengan nama hidangan / bahan.", ru: "Извините, поиск по «{text}» не удался. Повторите чуть позже или переформулируйте, указав блюдо или ингредиент.", de: "Entschuldige, die Suche nach „{text}“ ist fehlgeschlagen. Versuch es gleich noch einmal oder formuliere mit einem Gericht- oder Zutatennamen um.", zh: "抱歉，搜索 \\\"{text}\\\" 失败。请稍后再试，或换成菜名／食材名。", ja: "申し訳ありません。「{text}」の検索に失敗しました。少し後で再試行するか、料理名や食材名で言い換えてください。", es: "Lo siento, la búsqueda de «{text}» falló. Inténtalo en un momento o reformúlala con el nombre de un plato o ingrediente.", ko: "죄송합니다. \"{text}\" 검색에 실패했습니다. 잠시 후 다시 시도하시거나 요리명 또는 재료명으로 바꿔서 입력해 주세요." },
  "bot.index.iThisTermHasMultiple": { en: "🤔 <i>This term has multiple meanings — tap one to refine:</i>\\n\\n", fr: "🤔 <i>Plusieurs interprétations possibles. Tapez l'une des options ci-dessous:</i>\\n\\n", id: "🤔 <i>Istilah ini punya banyak arti — ketuk salah satu untuk memperjelas:</i>\\n\\n", ru: "🤔 <i>У этого слова несколько значений — выберите одно для уточнения:</i>\\n\\n", de: "🤔 <i>Dieser Begriff hat mehrere Bedeutungen — tippe eine an, um zu präzisieren:</i>\\n\\n", zh: "🤔 <i>该词有多种含义 — 点击其一以细化：</i>\\n\\n", ja: "🤔 <i>この語には複数の意味があります — いずれかをタップして絞り込んでください：</i>\\n\\n", es: "🤔 <i>Este término tiene varios significados — toca uno para concretar:</i>\\n\\n", ko: "🤔 <i>이 단어에는 여러 뜻이 있습니다 — 하나를 눌러 좁혀 주세요:</i>\\n\\n" },
  "bot.index.sorryICouldnTInterpret": { en: "Sorry, I couldn\\'t interpret that. Try a dish name or ingredient.", fr: "Désolé, je n\\'ai pas pu interpréter votre requête. Réessayez avec un nom de plat ou d\\'ingrédient.", id: "Maaf, saya tidak bisa menafsirkan itu. Coba nama hidangan atau bahan.", ru: "Извините, не удалось это разобрать. Попробуйте название блюда или ингредиент.", de: "Entschuldige, das konnte ich nicht deuten. Versuch einen Gericht- oder Zutatennamen.", zh: "抱歉，无法理解。请试试菜名或食材名。", ja: "申し訳ありません、解釈できませんでした。料理名か食材名でお試しください。", es: "Lo siento, no pude interpretarlo. Prueba con el nombre de un plato o ingrediente.", ko: "죄송합니다. 이해하지 못했습니다. 요리명이나 재료명을 입력해 보세요." },
  "bot.index.couldYouClarifyWhichDish": { en: "Could you clarify? Which dish or ingredient are you looking for exactly?", fr: "Pouvez-vous préciser ? Quel plat ou ingrédient cherchez-vous exactement ?", id: "Bisa diperjelas? Hidangan atau bahan apa persisnya yang Anda cari?", ru: "Уточните, пожалуйста: какое именно блюдо или ингредиент вы ищете?", de: "Kannst du das präzisieren? Welches Gericht oder welche Zutat genau suchst du?", zh: "能说得更具体些吗？你确切想找什么菜或食材？", ja: "もう少し詳しく教えてください。どの料理・食材をお探しですか？", es: "¿Puedes concretar? ¿Qué plato o ingrediente buscas exactamente?", ko: "조금 더 구체적으로 알려주시겠어요? 어떤 요리나 재료를 찾고 계신가요?" },
  "bot.index.cookingTechnique": { en: "cooking technique.", fr: "technique de cuisson.", id: "teknik memasak.", ru: "техника приготовления.", de: "Kochtechnik.", zh: "烹饪技法。", ja: "調理技法。", es: "técnica de cocción.", ko: "조리 기법." },
  "bot.index.bBIThesePlaces": { en: "{a} <b>{what}</b>\\n\\n<i>These places may have it. Please verify.</i>", fr: "{a} <b>{what}</b>\\n\\n<i>Ces lieux peuvent le proposer. Veuillez vérifier.</i>", id: "{a} <b>{what}</b>\\n\\n<i>Tempat-tempat ini mungkin menyediakannya. Mohon periksa.</i>", ru: "{a} <b>{what}</b>\\n\\n<i>Возможно, это есть в этих местах. Пожалуйста, уточните.</i>", de: "{a} <b>{what}</b>\\n\\n<i>Diese Orte haben es vielleicht. Bitte prüfen.</i>", zh: "{a} <b>{what}</b>\\n\\n<i>这些店可能有。请自行确认。</i>", ja: "{a} <b>{what}</b>\\n\\n<i>これらの店にあるかもしれません。ご確認ください。</i>", es: "{a} <b>{what}</b>\\n\\n<i>Estos sitios podrían tenerlo. Por favor, verifica.</i>", ko: "{a} <b>{what}</b>\\n\\n<i>이곳들에 있을 수 있습니다. 확인해 주세요.</i>" },
  "bot.index.ingredient": { en: "ingredient.", fr: "ingrédient.", id: "bahan.", ru: "ингредиент.", de: "Zutat.", zh: "食材。", ja: "食材。", es: "ingrediente.", ko: "재료." },
  "bot.index.bBIThesePlaces2": { en: "🌿 <b>{what}</b>\\n\\n<i>These places may have it. Please verify.</i>", fr: "🌿 <b>{what}</b>\\n\\n<i>Ces lieux peuvent le proposer. Veuillez vérifier.</i>", id: "🌿 <b>{what}</b>\\n\\n<i>Tempat-tempat ini mungkin menyediakannya. Mohon periksa.</i>", ru: "🌿 <b>{what}</b>\\n\\n<i>Возможно, это есть в этих местах. Пожалуйста, уточните.</i>", de: "🌿 <b>{what}</b>\\n\\n<i>Diese Orte haben es vielleicht. Bitte prüfen.</i>", zh: "🌿 <b>{what}</b>\\n\\n<i>这些店可能有。请自行确认。</i>", ja: "🌿 <b>{what}</b>\\n\\n<i>これらの店にあるかもしれません。ご確認ください。</i>", es: "🌿 <b>{what}</b>\\n\\n<i>Estos sitios podrían tenerlo. Por favor, verifica.</i>", ko: "🌿 <b>{what}</b>\\n\\n<i>이곳들에 있을 수 있습니다. 확인해 주세요.</i>" },
  "bot.index.searching": { en: "searching.", fr: "recherche en cours.", id: "mencari.", ru: "поиск.", de: "Suche.", zh: "搜索中。", ja: "検索中。", es: "buscando.", ko: "검색 중." },
  "bot.index.sorryNoMatchingVenuesFound": { en: "Sorry, no matching venues found in Singapore for that query. Try another dish or ingredient.", fr: "Désolé, aucun lieu correspondant trouvé près de Singapour pour cette requête. Essayez un autre plat ou ingrédient.", id: "Maaf, tidak ada tempat yang cocok di Singapura untuk kueri itu. Coba hidangan atau bahan lain.", ru: "Извините, в Сингапуре не нашлось подходящих мест по этому запросу. Попробуйте другое блюдо или ингредиент.", de: "Entschuldige, für diese Anfrage wurden in Singapur keine passenden Lokale gefunden. Versuch ein anderes Gericht oder eine andere Zutat.", zh: "抱歉，新加坡没有符合该查询的餐馆。请换个菜名或食材。", ja: "申し訳ありません。その条件に合う店はシンガポールで見つかりませんでした。別の料理や食材でお試しください。", es: "Lo siento, no se encontraron locales en Singapur para esa consulta. Prueba con otro plato o ingrediente.", ko: "죄송합니다. 해당 검색어로 싱가포르에서 일치하는 곳을 찾지 못했습니다. 다른 요리나 재료로 시도해 보세요." },
  "bot.index.try": { en: "Try", fr: "Essayez", id: "Coba", ru: "Попробуйте", de: "Probier", zh: "试试", ja: "おすすめ", es: "Prueba", ko: "시도해 보세요" },
  "bot.index.iMappingBBAcross": { en: "🔍 <i>Mapping <b>{technique}</b> across Singapore cuisines…</i>", fr: "🔍 <i>Cartographie de <b>{technique}</b> à travers les cuisines de Singapour…</i>", id: "🔍 <i>Memetakan <b>{technique}</b> di berbagai masakan Singapura…</i>", ru: "🔍 <i>Ищу <b>{technique}</b> по кухням Сингапура…</i>", de: "🔍 <i>Erfasse <b>{technique}</b> in den Küchen Singapurs…</i>", zh: "🔍 <i>正在梳理新加坡各菜系中的 <b>{technique}</b>…</i>", ja: "🔍 <i>シンガポールの各料理ジャンルにおける <b>{technique}</b> を調査中…</i>", es: "🔍 <i>Rastreando <b>{technique}</b> en las cocinas de Singapur…</i>", ko: "🔍 <i>싱가포르의 여러 요리에서 <b>{technique}</b> 을(를) 찾는 중…</i>" },
  "bot.index.iFoundPossibleEateriesAcross": { en: "✓ <i>Found {count} possible eateries across {count2} cuisines · validating authenticity…</i>", fr: "✓ <i>{count} établissements possibles trouvés à travers {count2} cuisines · validation de l'authenticité…</i>", id: "✓ <i>Ditemukan {count} tempat makan potensial di {count2} masakan · memvalidasi keautentikan…</i>", ru: "✓ <i>Найдено {count} возможных заведений в {count2} кухнях · проверка аутентичности…</i>", de: "✓ <i>{count} mögliche Lokale in {count2} Küchen gefunden · prüfe Authentizität…</i>", zh: "✓ <i>在 {count2} 个菜系中找到 {count} 家可能的餐馆 · 正在验证地道性…</i>", ja: "✓ <i>{count2}ジャンルで{count}件の候補を発見 · 本場らしさを検証中…</i>", es: "✓ <i>Encontrados {count} locales posibles en {count2} cocinas · validando autenticidad…</i>", ko: "✓ <i>{count2}개 요리 종류에서 {count}곳의 후보를 찾았습니다 · 정통성을 확인하는 중…</i>" },
  "bot.index.iAuthenticVenuesFetchingTransit": { en: "✓ <i>{count} authentic venues · fetching transit + drive times…</i>", fr: "✓ <i>{count} restaurants authentiques · récupération des temps de transport…</i>", id: "✓ <i>{count} tempat autentik · mengambil waktu transit + berkendara…</i>", ru: "✓ <i>{count} аутентичных мест · получаю время в пути…</i>", de: "✓ <i>{count} authentische Lokale · hole Fahrt- und Fahrzeiten…</i>", zh: "✓ <i>{count} 家地道餐馆 · 正在获取公共交通与驾车时间…</i>", ja: "✓ <i>本場の店{count}件 · 交通・車での所要時間を取得中…</i>", es: "✓ <i>{count} locales auténticos · obteniendo tiempos de transporte y coche…</i>", ko: "✓ <i>정통 식당 {count}곳 · 대중교통 및 운전 시간을 가져오는 중…</i>" },
  "bot.index.sorryNoAuthenticSingaporeRestaurants": { en: "Sorry, no authentic Singapore restaurants found for this technique. Try a specific dish name (e.g. \"beef bourguignon\", \"osso buco\").", fr: "Désolé, aucun restaurant authentique trouvé à Singapour pour cette technique. Essayez un nom de plat précis (par ex. « beef bourguignon », « osso buco »).", id: "Maaf, tidak ada restoran autentik di Singapura untuk teknik ini. Coba nama hidangan yang spesifik (mis. \\\"beef bourguignon\\\", \\\"osso buco\\\").", ru: "Извините, аутентичных ресторанов в Сингапуре для этой техники не нашлось. Попробуйте конкретное блюдо (например, «beef bourguignon», «osso buco»).", de: "Entschuldige, für diese Technik wurden keine authentischen Lokale in Singapur gefunden. Versuch einen konkreten Gerichtnamen (z. B. „beef bourguignon“, „osso buco“).", zh: "抱歉，新加坡没有使用该技法的地道餐厅。请试试具体菜名（例如 \\\"beef bourguignon\\\"、\\\"osso buco\\\"）。", ja: "申し訳ありません。この技法で本場の店はシンガポールで見つかりませんでした。具体的な料理名（例：「beef bourguignon」「osso buco」）でお試しください。", es: "Lo siento, no se encontraron restaurantes auténticos en Singapur para esta técnica. Prueba con un plato concreto (p. ej. «beef bourguignon», «osso buco»).", ko: "죄송합니다. 이 조리 기법에 해당하는 싱가포르의 정통 식당을 찾지 못했습니다. 구체적인 요리명으로 시도해 보세요 (예: \"beef bourguignon\", \"osso buco\")." },
  "bot.index.iInSingaporeThisTechnique": { en: "<i>In Singapore, this technique looks different across cuisines:</i>", fr: "<i>À Singapour, cette technique se décline selon les cuisines:</i>", id: "<i>Di Singapura, teknik ini tampak berbeda di tiap masakan:</i>", ru: "<i>В Сингапуре эта техника выглядит по-разному в разных кухнях:</i>", de: "<i>In Singapur sieht diese Technik in jeder Küche anders aus:</i>", zh: "<i>在新加坡，这一技法在各菜系中各有不同：</i>", ja: "<i>シンガポールでは、この技法は料理ジャンルごとに姿を変えます：</i>", es: "<i>En Singapur, esta técnica se ve distinta en cada cocina:</i>", ko: "<i>싱가포르에서는 이 기법이 요리 종류마다 다르게 나타납니다:</i>" },
  "bot.index.sorrySomethingWentWrongWhile": { en: "Sorry, something went wrong while searching for <b>{a}</b>. Try again?", fr: "Désolé, erreur lors de la recherche pour <b>{a}</b>. Réessayez ?", id: "Maaf, terjadi kesalahan saat mencari <b>{a}</b>. Coba lagi?", ru: "Извините, при поиске <b>{a}</b> что-то пошло не так. Повторить?", de: "Entschuldige, bei der Suche nach <b>{a}</b> ist etwas schiefgelaufen. Nochmal versuchen?", zh: "抱歉，搜索 <b>{a}</b> 时出错。要再试一次吗？", ja: "申し訳ありません。<b>{a}</b> の検索中に問題が発生しました。再試行しますか？", es: "Lo siento, algo falló al buscar <b>{a}</b>. ¿Reintentar?", ko: "죄송합니다. <b>{a}</b> 을(를) 검색하는 중 문제가 발생했습니다. 다시 시도할까요?" },
  "bot.index.sorryNoVenuesFoundFor": { en: "Sorry, no venues found for <b>{dish}</b>. Did you mean something else? Try e.g. <code>/s {dish}</code> with different words.", fr: "Désolé, aucun lieu trouvé pour <b>{dish}</b>. Vouliez-vous dire autre chose ? Essayez par ex. <code>/s {dish}</code> avec d\\'autres mots.", id: "Maaf, tidak ada tempat untuk <b>{dish}</b>. Mungkin maksud Anda lain? Coba mis. <code>/s {dish}</code> dengan kata berbeda.", ru: "Извините, мест для <b>{dish}</b> не найдено. Возможно, вы имели в виду другое? Попробуйте, например, <code>/s {dish}</code> с другими словами.", de: "Entschuldige, keine Lokale für <b>{dish}</b> gefunden. Meintest du etwas anderes? Versuch z. B. <code>/s {dish}</code> mit anderen Wörtern.", zh: "抱歉，没有找到 <b>{dish}</b> 的餐馆。你是不是想找别的？可以试试 <code>/s {dish}</code> 换些词。", ja: "申し訳ありません。<b>{dish}</b> の店は見つかりませんでした。別のものをお探しですか？例：<code>/s {dish}</code> を別の言葉でお試しください。", es: "Lo siento, no se encontraron locales para <b>{dish}</b>. ¿Querías decir otra cosa? Prueba p. ej. <code>/s {dish}</code> con otras palabras.", ko: "죄송합니다. <b>{dish}</b> 에 해당하는 곳을 찾지 못했습니다. 다른 것을 찾으셨나요? 예를 들어 <code>/s {dish}</code> 를 다른 단어로 바꿔서 시도해 보세요." },
  "bot.index.drink": { en: "drink", fr: "boisson", id: "minuman", ru: "напиток", de: "Getränk", zh: "饮品", ja: "ドリンク", es: "bebida", ko: "음료" },
  "bot.index.dish": { en: "dish", fr: "plat", id: "hidangan", ru: "блюдо", de: "Gericht", zh: "菜品", ja: "料理", es: "plato", ko: "요리" },
  "bot.index.iAlsoClaimedByI": { en: "🔄 <i>Also claimed by: {others}</i>", fr: "🔄 <i>Aussi revendiqué par: {others}</i>", id: "🔄 <i>Juga diklaim oleh: {others}</i>", ru: "🔄 <i>Также заявлено: {others}</i>", de: "🔄 <i>Auch beansprucht von: {others}</i>", zh: "🔄 <i>也被这些菜系认领：{others}</i>", ja: "🔄 <i>他にも名乗る地域：{others}</i>", es: "🔄 <i>También reclamado por: {others}</i>", ko: "🔄 <i>다음 요리에서도 자기 것이라고 합니다: {others}</i>" },
  "bot.index.sorryTheSearchForB": { en: "Sorry, the search for <b>{dish}</b> failed. Did you mean something else? Try e.g. <code>/s {dish}</code> with different words, or type another query.", fr: "Désolé, la recherche de <b>{dish}</b> a échoué. Vouliez-vous dire autre chose ? Essayez par ex. <code>/s {dish}</code> avec d\\'autres mots, ou tapez une autre requête.", id: "Maaf, pencarian <b>{dish}</b> gagal. Mungkin maksud Anda lain? Coba mis. <code>/s {dish}</code> dengan kata berbeda, atau ketik kueri lain.", ru: "Извините, поиск <b>{dish}</b> не удался. Возможно, вы имели в виду другое? Попробуйте <code>/s {dish}</code> с другими словами или другой запрос.", de: "Entschuldige, die Suche nach <b>{dish}</b> ist fehlgeschlagen. Meintest du etwas anderes? Versuch <code>/s {dish}</code> mit anderen Wörtern oder eine andere Anfrage.", zh: "抱歉，搜索 <b>{dish}</b> 失败。你是不是想找别的？试试 <code>/s {dish}</code> 换些词，或输入其他查询。", ja: "申し訳ありません。<b>{dish}</b> の検索に失敗しました。別のものをお探しですか？<code>/s {dish}</code> を別の言葉で、または別の検索語でお試しください。", es: "Lo siento, la búsqueda de <b>{dish}</b> falló. ¿Querías decir otra cosa? Prueba <code>/s {dish}</code> con otras palabras, o escribe otra consulta.", ko: "죄송합니다. <b>{dish}</b> 검색에 실패했습니다. 다른 것을 찾으셨나요? 예를 들어 <code>/s {dish}</code> 를 다른 단어로 바꿔서 시도하시거나 다른 검색어를 입력해 주세요." },
  "bot.index.sorryNoBBVenues": { en: "Sorry, no <b>{cuisine}</b> venues found for <b>{term}</b>. Did you mean something else? Try e.g. <code>/s {term}</code> with different words.", fr: "Désolé, aucun restaurant <b>{cuisine}</b> trouvé pour <b>{term}</b>. Vouliez-vous dire autre chose ? Essayez par ex. <code>/s {term}</code> avec d\\'autres mots.", id: "Maaf, tidak ada tempat <b>{cuisine}</b> untuk <b>{term}</b>. Mungkin maksud Anda lain? Coba mis. <code>/s {term}</code> dengan kata berbeda.", ru: "Извините, заведений <b>{cuisine}</b> для <b>{term}</b> не найдено. Возможно, вы имели в виду другое? Попробуйте <code>/s {term}</code> с другими словами.", de: "Entschuldige, keine <b>{cuisine}</b>-Lokale für <b>{term}</b> gefunden. Meintest du etwas anderes? Versuch <code>/s {term}</code> mit anderen Wörtern.", zh: "抱歉，没有找到 <b>{term}</b> 的 <b>{cuisine}</b> 餐馆。你是不是想找别的？试试 <code>/s {term}</code> 换些词。", ja: "申し訳ありません。<b>{term}</b> に合う <b>{cuisine}</b> の店は見つかりませんでした。別のものをお探しですか？<code>/s {term}</code> を別の言葉でお試しください。", es: "Lo siento, no se encontraron locales de <b>{cuisine}</b> para <b>{term}</b>. ¿Querías decir otra cosa? Prueba <code>/s {term}</code> con otras palabras.", ko: "죄송합니다. <b>{term}</b> 에 해당하는 <b>{cuisine}</b> 식당을 찾지 못했습니다. 다른 것을 찾으셨나요? 예를 들어 <code>/s {term}</code> 를 다른 단어로 바꿔서 시도해 보세요." },
  "bot.index.iThesePlacesMayHave": { en: "<i>These places may have it. Please verify.</i>", fr: "<i>Ces lieux peuvent le proposer. Veuillez vérifier.</i>", id: "<i>Tempat-tempat ini mungkin menyediakannya. Mohon periksa.</i>", ru: "<i>Возможно, это есть в этих местах. Пожалуйста, уточните.</i>", de: "<i>Diese Orte haben es vielleicht. Bitte prüfen.</i>", zh: "<i>这些店可能有。请自行确认。</i>", ja: "<i>これらの店にあるかもしれません。ご確認ください。</i>", es: "<i>Estos sitios podrían tenerlo. Por favor, verifica.</i>", ko: "<i>이곳들에 있을 수 있습니다. 확인해 주세요.</i>" },
  "bot.index.sorryICouldnTFormat": { en: "Sorry, I couldn't format the results for <b>{term}</b>. Try again in a moment.", fr: "Désolé, je n\\'ai pas pu présenter les résultats pour <b>{term}</b>. Réessayez dans un instant.", id: "Maaf, saya tidak bisa menyusun hasil untuk <b>{term}</b>. Coba lagi sebentar lagi.", ru: "Извините, не удалось оформить результаты для <b>{term}</b>. Повторите чуть позже.", de: "Entschuldige, ich konnte die Ergebnisse für <b>{term}</b> nicht formatieren. Versuch es gleich noch einmal.", zh: "抱歉，无法整理 <b>{term}</b> 的结果。请稍后再试。", ja: "申し訳ありません。<b>{term}</b> の結果を整形できませんでした。少し後でお試しください。", es: "Lo siento, no pude formatear los resultados de <b>{term}</b>. Inténtalo en un momento.", ko: "죄송합니다. <b>{term}</b> 의 결과를 정리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
  "bot.index.sorryTheSearchForB2": { en: "Sorry, the search for <b>{term}</b> failed. Did you mean something else? Try e.g. <code>/s {term}</code> with different words, or type another query.", fr: "Désolé, la recherche de <b>{term}</b> a échoué. Vouliez-vous dire autre chose ? Essayez par ex. <code>/s {term}</code> avec d\\'autres mots, ou tapez une autre requête.", id: "Maaf, pencarian <b>{term}</b> gagal. Mungkin maksud Anda lain? Coba mis. <code>/s {term}</code> dengan kata berbeda, atau ketik kueri lain.", ru: "Извините, поиск <b>{term}</b> не удался. Возможно, вы имели в виду другое? Попробуйте <code>/s {term}</code> с другими словами или другой запрос.", de: "Entschuldige, die Suche nach <b>{term}</b> ist fehlgeschlagen. Meintest du etwas anderes? Versuch <code>/s {term}</code> mit anderen Wörtern oder eine andere Anfrage.", zh: "抱歉，搜索 <b>{term}</b> 失败。你是不是想找别的？试试 <code>/s {term}</code> 换些词，或输入其他查询。", ja: "申し訳ありません。<b>{term}</b> の検索に失敗しました。別のものをお探しですか？<code>/s {term}</code> を別の言葉で、または別の検索語でお試しください。", es: "Lo siento, la búsqueda de <b>{term}</b> falló. ¿Querías decir otra cosa? Prueba <code>/s {term}</code> con otras palabras, o escribe otra consulta.", ko: "죄송합니다. <b>{term}</b> 검색에 실패했습니다. 다른 것을 찾으셨나요? 예를 들어 <code>/s {term}</code> 를 다른 단어로 바꿔서 시도하시거나 다른 검색어를 입력해 주세요." },
  "bot.index.guide2025CuratedRecommendation": { en: "{tier} Guide 2025 · curated recommendation.", fr: "{tier} Guide 2025 · recommandation curatée.", id: "{tier} Guide 2025 · rekomendasi kurasi.", ru: "{tier} Guide 2025 · кураторская рекомендация.", de: "{tier} Guide 2025 · kuratierte Empfehlung.", zh: "{tier} Guide 2025 · 精选推荐。", ja: "{tier} Guide 2025 · 厳選のおすすめ。", es: "{tier} Guide 2025 · recomendación curada.", ko: "{tier} 가이드 2025 · 엄선한 추천." },
  "bot.index.clipRenamedToTypeClipboard": { en: "✅ Clip {n} renamed to \"{name}\". Type /clipboard to see the updated list.", fr: "✅ Clip {n} renommé : « {name} ». Tapez /clipboard pour voir la liste mise à jour.", id: "✅ Klip {n} diubah namanya menjadi \\\"{name}\\\". Ketik /clipboard untuk melihat daftar terbaru.", ru: "✅ Клип {n} переименован в «{name}». Введите /clipboard, чтобы увидеть обновлённый список.", de: "✅ Clip {n} umbenannt in „{name}“. Tippe /clipboard für die aktualisierte Liste.", zh: "✅ 剪辑 {n} 已重命名为 \\\"{name}\\\"。输入 /clipboard 查看更新后的列表。", ja: "✅ クリップ{n}を「{name}」に変更しました。/clipboard で最新の一覧を確認できます。", es: "✅ Clip {n} renombrado a «{name}». Escribe /clipboard para ver la lista actualizada.", ko: "✅ 클립 {n}의 이름을 \"{name}\" (으)로 변경했습니다. /clipboard 를 입력하면 변경된 목록을 볼 수 있습니다." },
  "bot.index.couldnTRenameTheClip": { en: "❌ Couldn't rename — the clip may no longer exist.", fr: "❌ Renommage impossible — le clip n'existe peut-être plus.", id: "❌ Gagal mengubah nama — klip mungkin sudah tidak ada.", ru: "❌ Не удалось переименовать — клипа, возможно, больше нет.", de: "❌ Umbenennen fehlgeschlagen — der Clip existiert möglicherweise nicht mehr.", zh: "❌ 重命名失败 — 该剪辑可能已不存在。", ja: "❌ 名前を変更できませんでした — クリップが存在しない可能性があります。", es: "❌ No se pudo renombrar — puede que el clip ya no exista.", ko: "❌ 이름을 변경하지 못했습니다 — 해당 클립이 더 이상 없을 수 있습니다." },
  "bot.index.resultsFor": { en: "🔎 Results for \"{dish}\"", fr: "🔎 Résultats pour \"{dish}\"", id: "🔎 Hasil untuk \\\"{dish}\\\"", ru: "🔎 Результаты по «{dish}»", de: "🔎 Ergebnisse für „{dish}“", zh: "🔎 \\\"{dish}\\\" 的搜索结果", ja: "🔎 「{dish}」の検索結果", es: "🔎 Resultados de «{dish}»", ko: "🔎 \"{dish}\" 검색 결과" },
  "bot.index.wantTheTopRatedEateries": { en: "_Want the top-rated eateries nearby (~{km} km, ranked by rating · Michelin · rarity · crowd)?_", fr: "_Voulez-vous voir les meilleurs établissements à proximité (~{km} km, classés par note · Michelin · rareté · affluence) ?_", id: "_Mau lihat tempat makan dengan rating tertinggi di sekitar (~{km} km, diurutkan menurut rating · Michelin · kelangkaan · keramaian)?_", ru: "_Показать заведения с лучшими оценками рядом (~{km} км, по рейтингу · Michelin · редкости · загруженности)?_", de: "_Willst du die bestbewerteten Lokale in der Nähe (~{km} km, sortiert nach Bewertung · Michelin · Seltenheit · Andrang)?_", zh: "_想看看附近评分最高的餐馆吗（约 {km} 公里，按评分 · 米其林 · 稀有度 · 人气排序）？_", ja: "_近くの高評価店を見ますか（約{km} km、評価・ミシュラン・希少性・混雑で並べ替え）？_", es: "_¿Quieres los locales mejor valorados cerca (~{km} km, ordenados por valoración · Michelin · rareza · afluencia)?_", ko: "_근처(약 {km}km)에서 평점이 가장 높은 곳을 보시겠어요? (평점 · 미쉐린 · 희소성 · 혼잡도 순)_" },
  "bot.index.reRunnableCuisineCommandTap": { en: "🔗 Re-runnable cuisine command — tap to copy, paste in any chat with @soleat_bot to relaunch this exact search:", fr: "🔗 Commande cuisine réutilisable — touchez pour copier, collez dans n’importe quelle discussion avec @soleat_bot pour relancer cette recherche :", id: "🔗 Perintah cuisine yang bisa dijalankan ulang — ketuk untuk menyalin, tempel di obrolan mana pun dengan @soleat_bot untuk mengulang pencarian ini:", ru: "🔗 Повторяемая команда cuisine — нажмите, чтобы скопировать, и вставьте в любой чат с @soleat_bot, чтобы запустить этот же поиск:", de: "🔗 Wiederholbarer cuisine-Befehl — zum Kopieren tippen und in einem Chat mit @soleat_bot einfügen, um genau diese Suche neu zu starten:", zh: "🔗 可重复运行的 cuisine 指令 — 点击复制，粘贴到与 @soleat_bot 的任意对话中即可重跑此次搜索：", ja: "🔗 再実行できる cuisine コマンド — タップしてコピーし、@soleat_bot とのチャットに貼り付けると同じ検索を再開できます：", es: "🔗 Comando cuisine reejecutable — toca para copiar y pégalo en cualquier chat con @soleat_bot para relanzar esta misma búsqueda:", ko: "🔗 다시 실행할 수 있는 명령 — 눌러서 복사한 뒤 @soleat_bot 과의 대화에 붙여넣으면 이 검색을 그대로 다시 실행합니다:" },
  "bot.footfallsignal.peaks": { en: "peaks", fr: "pic", id: "puncak", ru: "пик", de: "Spitze", zh: "高峰", ja: "ピーク", es: "pico", ko: "혼잡 시간" },
  "bot.nationoverlay.bIconicDishesB": { en: "🍽 <b>Iconic dishes:</b>", fr: "🍽 <b>Plats emblématiques:</b>", id: "🍽 <b>Hidangan ikonik:</b>", ru: "🍽 <b>Знаковые блюда:</b>", de: "🍽 <b>Ikonische Gerichte:</b>", zh: "🍽 <b>标志性菜肴：</b>", ja: "🍽 <b>代表的な料理：</b>", es: "🍽 <b>Platos icónicos:</b>", ko: "🍽 <b>대표 요리:</b>" },
  "bot.nationoverlay.bAlsoClaimedByB": { en: "\\n\\n🔄 <b>Also claimed by:</b>\\n", fr: "\\n\\n🔄 <b>Aussi revendiqué par:</b>\\n", id: "\\n\\n🔄 <b>Juga diklaim oleh:</b>\\n", ru: "\\n\\n🔄 <b>Также заявлено:</b>\\n", de: "\\n\\n🔄 <b>Auch beansprucht von:</b>\\n", zh: "\\n\\n🔄 <b>也被这些菜系认领：</b>\\n", ja: "\\n\\n🔄 <b>他にも名乗る地域：</b>\\n", es: "\\n\\n🔄 <b>También reclamado por:</b>\\n", ko: "\\n\\n🔄 <b>다음 요리에서도 자기 것이라고 합니다:</b>\\n" },
  "bot.venuetemplates.petAllowed": { en: "🐾 Pet allowed", fr: "🐾 Animaux autorisés", id: "🐾 Boleh bawa hewan", ru: "🐾 Можно с питомцем", de: "🐾 Haustiere erlaubt", zh: "🐾 可携带宠物", ja: "🐾 ペット可", es: "🐾 Se admiten mascotas", ko: "🐾 반려동물 동반 가능" },
  "bot.venuetemplates.try": { en: "Try", fr: "Essayez", id: "Coba", ru: "Попробуйте", de: "Probier", zh: "试试", ja: "おすすめ", es: "Prueba", ko: "시도해 보세요" },
  "bot.searchconversation.tipTypeSEndTo": { en: "\\n\\n_Tip: type `/s end` to finish this conversation, or any other `/...` command to switch._", fr: "\\n\\n_Astuce : tapez `/s end` pour terminer cette conversation, ou n\\'importe quelle autre commande `/...` pour passer à autre chose._", id: "\\n\\n_Tips: ketik `/s end` untuk mengakhiri percakapan ini, atau perintah `/...` lain untuk berpindah._", ru: "\\n\\n_Совет: введите `/s end`, чтобы завершить диалог, или любую другую команду `/...`, чтобы переключиться._", de: "\\n\\n_Tipp: tippe `/s end`, um diese Unterhaltung zu beenden, oder einen anderen `/...`-Befehl zum Wechseln._", zh: "\\n\\n_提示：输入 `/s end` 结束本次对话，或输入其他 `/...` 指令切换。_", ja: "\\n\\n_ヒント：`/s end` と入力するとこの会話を終了、他の `/...` コマンドで切り替えできます。_", es: "\\n\\n_Consejo: escribe `/s end` para terminar esta conversación, o cualquier otro comando `/...` para cambiar._", ko: "\\n\\n_팁: `/s end` 를 입력하면 이 대화를 마치고, 다른 `/...` 명령을 입력하면 전환합니다._" },

  // The language NAMES the /language notice interpolates. Previously two nested ternaries
  // producing only "French"/"English" — so a Japanese reader was told, in Japanese, that
  // their client was in "English". Eight names × eight reading locales.
  "bot.langname.en": { en: "English", fr: "anglais", id: "bahasa Inggris", ru: "английском", de: "Englisch", zh: "英语", ja: "英語", es: "inglés", ko: "영어" },
  "bot.langname.fr": { en: "French", fr: "français", id: "bahasa Prancis", ru: "французском", de: "Französisch", zh: "法语", ja: "フランス語", es: "francés", ko: "프랑스어" },
  "bot.langname.id": { en: "Indonesian", fr: "indonésien", id: "bahasa Indonesia", ru: "индонезийском", de: "Indonesisch", zh: "印尼语", ja: "インドネシア語", es: "indonesio", ko: "인도네시아어" },
  "bot.langname.ru": { en: "Russian", fr: "russe", id: "bahasa Rusia", ru: "русском", de: "Russisch", zh: "俄语", ja: "ロシア語", es: "ruso", ko: "러시아어" },
  "bot.langname.de": { en: "German", fr: "allemand", id: "bahasa Jerman", ru: "немецком", de: "Deutsch", zh: "德语", ja: "ドイツ語", es: "alemán", ko: "독일어" },
  "bot.langname.zh": { en: "Chinese", fr: "chinois", id: "bahasa Tionghoa", ru: "китайском", de: "Chinesisch", zh: "中文", ja: "中国語", es: "chino", ko: "중국어" },
  "bot.langname.ja": { en: "Japanese", fr: "japonais", id: "bahasa Jepang", ru: "японском", de: "Japanisch", zh: "日语", ja: "日本語", es: "japonés", ko: "일본어" },
  "bot.langname.es": { en: "Spanish", fr: "espagnol", id: "bahasa Spanyol", ru: "испанском", de: "Spanisch", zh: "西班牙语", ja: "スペイン語", es: "español", ko: "스페인어" },
  // v0.62.884 — bot.langname.ko. K6 added language.btn.ko and bot.lang.set.ko
  // and stopped there, so this family stayed at eight while SUPPORTED went to
  // nine. It was unreachable only because /start's drift hint gated on
  // ['en','fr']; widening that gate to SUPPORTED — the fix in this same PR —
  // is what would have put the literal string "bot.langname.ko" in front of a
  // Korean reader. The gate was hiding the gap, not preventing it.
  "bot.langname.ko": { en: "Korean", fr: "coréen", id: "bahasa Korea", ru: "корейском", de: "Koreanisch", zh: "韩语", ja: "韓国語", es: "coreano", ko: "한국어" },

  // The same defect wearing a different face: nine sites hoisted the comparison into a
  // boolean first — `const isFr = lang === 'fr'` — so `isFr ? … : …` never matched the
  // sweep's pattern. Found by looking for the family rather than trusting the regex to
  // have covered it. Two of the nine had IDENTICAL arms ("Woodlands", "Tuas 2nd Link");
  // those are proper nouns and were collapsed to the literal rather than keyed.
  "bot.index.yesSwitch": { en: "✅ Yes, switch", fr: "✅ Oui, changer", id: "✅ Ya, ganti", ru: "✅ Да, переключить", de: "✅ Ja, wechseln", zh: "✅ 是，切换", ja: "✅ はい、切り替える", es: "✅ Sí, cambiar", ko: "✅ 네, 변경할게요" },
  "bot.index.noKeep": { en: "🚫 No, keep", fr: "🚫 Non, garder", id: "🚫 Tidak, biarkan", ru: "🚫 Нет, оставить", de: "🚫 Nein, behalten", zh: "🚫 否，保持", ja: "🚫 いいえ、そのまま", es: "🚫 No, mantener", ko: "🚫 아니요, 유지할게요" },
  "bot.index.queueEstimate": { en: "Queue estimate", fr: "Estimation file d’attente", id: "Perkiraan antrean", ru: "Оценка очереди", de: "Wartezeit-Schätzung", zh: "排队预估", ja: "待ち時間の目安", es: "Estimación de cola", ko: "대기 시간 예상" },
  "bot.index.queueDeparting": { en: "depart", fr: "sortie", id: "keluar", ru: "выезд", de: "Ausreise", zh: "出境", ja: "出国", es: "salida", ko: "출국" },
  "bot.index.queueArriving": { en: "arrive", fr: "entrée", id: "masuk", ru: "въезд", de: "Einreise", zh: "入境", ja: "入国", es: "entrada", ko: "입국" },
  "bot.index.queueOverall": { en: "overall", fr: "global", id: "keseluruhan", ru: "в целом", de: "gesamt", zh: "总体", ja: "全体", es: "total", ko: "전체" },
  "bot.index.queueSource": { en: "source: ICA · unofficial scrape", fr: "source : ICA · scraping non officiel", id: "sumber: ICA · pengambilan tidak resmi", ru: "источник: ICA · неофициальный сбор данных", de: "Quelle: ICA · inoffizieller Scrape", zh: "来源：ICA · 非官方抓取", ja: "出典：ICA · 非公式スクレイピング", es: "fuente: ICA · scraping no oficial", ko: "출처: ICA · 비공식 수집" },

  // A THIRD SHAPE, and the reason the sweep was checked rather than declared done: seven
  // sites wrote the ternary across LINES — `isFr` newline `? …` newline `: …` — so neither
  // the single-line regex nor the `isFr ?` grep saw them. Two carried a nested
  // `${q ? … : ''}` conditional whose text was itself English; those are SPLIT into a
  // with-query and a without-query key rather than passing an English fragment as a
  // parameter, which would have translated the sentence around a word left in English.
  "bot.index.commandSingaporeOnly": { en: "🇸🇬 The <code>/{label}</code> command is only available in Singapore (it pulls from LTA / NEA / HPB feeds). Your registered location is <b>{place}</b>. Re-register a Singapore location to re-enable.", fr: "🇸🇬 La commande <code>/{label}</code> n'est disponible qu'à Singapour (dépend des données LTA / NEA / HPB). Votre lieu enregistré est <b>{place}</b>. Réenregistrez un lieu à Singapour pour réactiver cette commande.", id: "🇸🇬 Perintah <code>/{label}</code> hanya tersedia di Singapura (mengambil data LTA / NEA / HPB). Lokasi terdaftar Anda adalah <b>{place}</b>. Daftarkan ulang lokasi di Singapura untuk mengaktifkannya.", ru: "🇸🇬 Команда <code>/{label}</code> доступна только в Сингапуре (использует данные LTA / NEA / HPB). Ваше сохранённое место — <b>{place}</b>. Сохраните место в Сингапуре, чтобы включить команду.", de: "🇸🇬 Der Befehl <code>/{label}</code> ist nur in Singapur verfügbar (er nutzt LTA-/NEA-/HPB-Daten). Dein gespeicherter Ort ist <b>{place}</b>. Registriere einen Ort in Singapur, um ihn wieder zu aktivieren.", zh: "🇸🇬 <code>/{label}</code> 指令仅在新加坡可用（数据来自 LTA / NEA / HPB）。你保存的位置是 <b>{place}</b>。请重新注册一个新加坡的位置以启用。", ja: "🇸🇬 <code>/{label}</code> コマンドはシンガポール限定です（LTA / NEA / HPB のデータを使用）。保存中の場所は <b>{place}</b> です。シンガポール内の場所を登録し直すと使えます。", es: "🇸🇬 El comando <code>/{label}</code> solo está disponible en Singapur (usa datos de LTA / NEA / HPB). Tu ubicación guardada es <b>{place}</b>. Registra una ubicación en Singapur para reactivarlo.", ko: "🇸🇬 <code>/{label}</code> 명령은 싱가포르에서만 사용할 수 있습니다 (LTA / NEA / HPB 데이터를 이용합니다). 등록된 위치는 <b>{place}</b> 입니다. 싱가포르 위치로 다시 등록하면 사용할 수 있습니다." },
  "bot.index.locationUpdatedTo": { en: "✅ Location updated to <b>{place}</b>.", fr: "✅ Lieu mis à jour vers <b>{place}</b>.", id: "✅ Lokasi diperbarui menjadi <b>{place}</b>.", ru: "✅ Место обновлено на <b>{place}</b>.", de: "✅ Ort aktualisiert auf <b>{place}</b>.", zh: "✅ 位置已更新为 <b>{place}</b>。", ja: "✅ 位置を <b>{place}</b> に更新しました。", es: "✅ Ubicación actualizada a <b>{place}</b>.", ko: "✅ 위치를 <b>{place}</b> (으)로 변경했습니다." },
  "bot.index.keptRegisteredLocation": { en: "🚫 Kept your registered location. No further prompt for this destination in the next 24 h.", fr: "🚫 Lieu enregistré conservé. Aucune nouvelle invite pendant 24 h pour cette destination.", id: "🚫 Lokasi terdaftar Anda dipertahankan. Tidak ada permintaan lagi untuk tujuan ini selama 24 jam.", ru: "🚫 Сохранённое место оставлено. В ближайшие 24 ч запросов по этому направлению не будет.", de: "🚫 Dein gespeicherter Ort bleibt. In den nächsten 24 Std keine weitere Nachfrage für dieses Ziel.", zh: "🚫 已保留你保存的位置。未来 24 小时内不会再为该目的地询问。", ja: "🚫 登録済みの場所を維持します。この目的地について今後24時間は確認しません。", es: "🚫 Se mantiene tu ubicación guardada. No se volverá a preguntar por este destino en 24 h.", ko: "🚫 등록된 위치를 유지합니다. 이 목적지에 대해서는 24시간 동안 다시 묻지 않습니다." },
  "bot.index.nowNearUpdate": { en: "🌐 You're now near <b>{near}</b>. Your registered location is <b>{saved}</b>. Update to the new one?", fr: "🌐 Vous êtes maintenant près de <b>{near}</b>. Votre lieu enregistré est <b>{saved}</b>. Mettre à jour ?", id: "🌐 Anda sekarang dekat <b>{near}</b>. Lokasi terdaftar Anda adalah <b>{saved}</b>. Perbarui ke yang baru?", ru: "🌐 Вы сейчас рядом с <b>{near}</b>. Сохранённое место — <b>{saved}</b>. Обновить на новое?", de: "🌐 Du bist jetzt in der Nähe von <b>{near}</b>. Dein gespeicherter Ort ist <b>{saved}</b>. Auf den neuen aktualisieren?", zh: "🌐 你现在靠近 <b>{near}</b>。你保存的位置是 <b>{saved}</b>。要更新为新的吗？", ja: "🌐 現在 <b>{near}</b> の近くにいます。登録済みの場所は <b>{saved}</b> です。新しい方に更新しますか？", es: "🌐 Ahora estás cerca de <b>{near}</b>. Tu ubicación guardada es <b>{saved}</b>. ¿Actualizar a la nueva?", ko: "🌐 지금 <b>{near}</b> 근처에 계십니다. 등록된 위치는 <b>{saved}</b> 입니다. 새 위치로 변경할까요?" },
  "bot.index.searchingOneMoment": { en: "🔎 <i>One moment — searching for eateries…</i>", fr: "🔎 <i>Un instant — je cherche des établissements…</i>", id: "🔎 <i>Sebentar — mencari tempat makan…</i>", ru: "🔎 <i>Минуту — ищу заведения…</i>", de: "🔎 <i>Einen Moment — ich suche Lokale…</i>", zh: "🔎 <i>稍等 — 正在搜索餐馆…</i>", ja: "🔎 <i>少々お待ちください — 飲食店を検索中…</i>", es: "🔎 <i>Un momento — buscando locales…</i>", ko: "🔎 <i>잠시만요 — 식당을 검색하고 있습니다…</i>" },
  "bot.index.searchingOneMomentFor": { en: "🔎 <i>One moment — searching for eateries for <b>{q}</b>…</i>", fr: "🔎 <i>Un instant — je cherche des établissements pour <b>{q}</b>…</i>", id: "🔎 <i>Sebentar — mencari tempat makan untuk <b>{q}</b>…</i>", ru: "🔎 <i>Минуту — ищу заведения по запросу <b>{q}</b>…</i>", de: "🔎 <i>Einen Moment — ich suche Lokale für <b>{q}</b>…</i>", zh: "🔎 <i>稍等 — 正在搜索 <b>{q}</b> 的餐馆…</i>", ja: "🔎 <i>少々お待ちください — <b>{q}</b> の飲食店を検索中…</i>", es: "🔎 <i>Un momento — buscando locales para <b>{q}</b>…</i>", ko: "🔎 <i>잠시만요 — <b>{q}</b> 에 맞는 식당을 검색하고 있습니다…</i>" },
  "bot.index.reassure1": { en: "🔎 <i>Still searching — thanks for your patience…</i>", fr: "🔎 <i>Toujours en recherche, merci de patienter…</i>", id: "🔎 <i>Masih mencari — terima kasih atas kesabaran Anda…</i>", ru: "🔎 <i>Всё ещё ищу — спасибо за терпение…</i>", de: "🔎 <i>Suche noch — danke für die Geduld…</i>", zh: "🔎 <i>仍在搜索 — 感谢耐心等待…</i>", ja: "🔎 <i>まだ検索中です — もう少しお待ちください…</i>", es: "🔎 <i>Sigo buscando — gracias por tu paciencia…</i>", ko: "🔎 <i>아직 검색 중입니다 — 기다려 주셔서 감사합니다…</i>" },
  "bot.index.reassure2": { en: "🔎 <i>Almost there…</i>", fr: "🔎 <i>J'y suis presque…</i>", id: "🔎 <i>Hampir selesai…</i>", ru: "🔎 <i>Почти готово…</i>", de: "🔎 <i>Fast geschafft…</i>", zh: "🔎 <i>快好了…</i>", ja: "🔎 <i>もうすぐです…</i>", es: "🔎 <i>Casi listo…</i>", ko: "🔎 <i>거의 다 됐습니다…</i>" },
  "bot.index.reassure3": { en: "🔎 <i>Just a moment more…</i>", fr: "🔎 <i>Encore un petit instant…</i>", id: "🔎 <i>Sebentar lagi…</i>", ru: "🔎 <i>Ещё чуть-чуть…</i>", de: "🔎 <i>Nur noch einen Moment…</i>", zh: "🔎 <i>再稍等一下…</i>", ja: "🔎 <i>あと少しです…</i>", es: "🔎 <i>Un momento más…</i>", ko: "🔎 <i>조금만 더 기다려 주세요…</i>" },
  "bot.index.takingLongerNoQuery": { en: "🕰️ <i>This is taking longer than usual.</i>\\nDid you mean something else? — or type another query. I'll keep searching in the meantime.", fr: "🕰️ <i>Cela prend plus de temps que d'habitude.</i>\\nVouliez-vous dire autre chose ? — ou tapez une autre requête. Je continue la recherche en attendant.", id: "🕰️ <i>Ini memakan waktu lebih lama dari biasanya.</i>\\nMungkin maksud Anda lain? — atau ketik kueri lain. Saya tetap mencari sementara itu.", ru: "🕰️ <i>Это занимает больше времени, чем обычно.</i>\\nВозможно, вы имели в виду другое? — или введите другой запрос. Я продолжу поиск.", de: "🕰️ <i>Das dauert länger als sonst.</i>\\nMeintest du etwas anderes? — oder tippe eine andere Anfrage. Ich suche derweil weiter.", zh: "🕰️ <i>这次比平时久一些。</i>\\n你是不是想找别的？— 或者输入其他查询。我会继续搜索。", ja: "🕰️ <i>いつもより時間がかかっています。</i>\\n別のものをお探しでしたか？ — 別の検索語を入力しても構いません。その間も検索を続けます。", es: "🕰️ <i>Está tardando más de lo habitual.</i>\\n¿Querías decir otra cosa? — o escribe otra consulta. Mientras tanto sigo buscando.", ko: "🕰️ <i>평소보다 오래 걸리고 있습니다.</i>\\n다른 것을 찾으셨나요? — 아니면 다른 검색어를 입력해 주세요. 그동안 계속 검색하겠습니다." },
  "bot.index.takingLongerWithQuery": { en: "🕰️ <i>This is taking longer than usual.</i>\\nDid you mean something else? Try rewording (e.g. <code>/s {q} …</code>) — or type another query. I'll keep searching in the meantime.", fr: "🕰️ <i>Cela prend plus de temps que d'habitude.</i>\\nVouliez-vous dire autre chose ? Reformulez (par ex. <code>/s {q} …</code>) — ou tapez une autre requête. Je continue la recherche en attendant.", id: "🕰️ <i>Ini memakan waktu lebih lama dari biasanya.</i>\\nMungkin maksud Anda lain? Coba ubah kata (mis. <code>/s {q} …</code>) — atau ketik kueri lain. Saya tetap mencari sementara itu.", ru: "🕰️ <i>Это занимает больше времени, чем обычно.</i>\\nВозможно, вы имели в виду другое? Попробуйте переформулировать (например, <code>/s {q} …</code>) — или введите другой запрос. Я продолжу поиск.", de: "🕰️ <i>Das dauert länger als sonst.</i>\\nMeintest du etwas anderes? Formuliere es um (z. B. <code>/s {q} …</code>) — oder tippe eine andere Anfrage. Ich suche derweil weiter.", zh: "🕰️ <i>这次比平时久一些。</i>\\n你是不是想找别的？可以换个说法（例如 <code>/s {q} …</code>）— 或者输入其他查询。我会继续搜索。", ja: "🕰️ <i>いつもより時間がかかっています。</i>\\n別のものをお探しでしたか？言い換えてみてください（例：<code>/s {q} …</code>）— 別の検索語でも構いません。その間も検索を続けます。", es: "🕰️ <i>Está tardando más de lo habitual.</i>\\n¿Querías decir otra cosa? Prueba a reformular (p. ej. <code>/s {q} …</code>) — o escribe otra consulta. Mientras tanto sigo buscando.", ko: "🕰️ <i>평소보다 오래 걸리고 있습니다.</i>\\n다른 것을 찾으셨나요? 표현을 바꿔 보시거나 (예: <code>/s {q} …</code>) 다른 검색어를 입력해 주세요. 그동안 계속 검색하겠습니다." },

  // TWO MORE THE REGEX MISSED, found by auditing what was left rather than trusting the
  // sweep to have been exhaustive: both write the FRENCH arm in double quotes because it
  // contains an apostrophe — `"toutes les notes"`, `"à l'instant"` — and the pattern only
  // matched single-quoted and template arms. A fourth shape, caught by reading the
  // remainder instead of declaring the count final.
  "bot.ratingpref.anyRating": { en: "any rating (no minimum)", fr: "toutes les notes (aucun minimum)", id: "semua rating (tanpa minimum)", ru: "любая оценка (без минимума)", de: "jede Bewertung (kein Minimum)", zh: "任意评分（无下限）", ja: "評価を問わない（下限なし）", es: "cualquier valoración (sin mínimo)", ko: "평점 무관 (최소 기준 없음)" },
  "bot.index.justNow": { en: "just now", fr: "à l'instant", id: "baru saja", ru: "только что", de: "gerade eben", zh: "刚刚", ja: "たった今", es: "justo ahora", ko: "방금" },

  // A FIFTH shape: multi-line, and the ENGLISH arm double-quoted because it contains an
  // apostrophe ("Soleat's"). Found by the sweep's own test, whose pattern admits double
  // quotes where the extractor's did not — the check being stricter than the tool is the
  // only reason the count is 132 and not 131.
  "bot.index.smartSuggestionsBusy": { en: "⚡ Soleat's smart suggestions are busy right now — showing direct matches. Try again in a moment for more.", fr: "⚡ Les suggestions intelligentes de Soleat sont très sollicitées — voici les correspondances directes. Réessayez dans un instant pour plus.", id: "⚡ Saran cerdas Soleat sedang sibuk — menampilkan kecocokan langsung. Coba lagi sebentar lagi untuk hasil lebih banyak.", ru: "⚡ Умные подсказки Soleat сейчас загружены — показываю прямые совпадения. Повторите чуть позже, чтобы увидеть больше.", de: "⚡ Soleats smarte Vorschläge sind gerade ausgelastet — ich zeige direkte Treffer. Versuch es gleich noch einmal für mehr.", zh: "⚡ Soleat 的智能推荐当前繁忙 — 先显示直接匹配的结果。请稍后再试以获取更多。", ja: "⚡ Soleatのスマート提案が混み合っています — 直接一致する結果を表示します。しばらくしてからもう一度お試しください。", es: "⚡ Las sugerencias inteligentes de Soleat están saturadas — muestro coincidencias directas. Inténtalo en un momento para ver más.", ko: "⚡ Soleat의 스마트 추천이 지금 혼잡합니다 — 직접 일치하는 결과만 표시합니다. 더 보시려면 잠시 후 다시 시도해 주세요." },
  // v0.62.884 — the Telegram slash-menu descriptions, moved out of index.js.
  // Until now they were inline string literals in registerCommandsMenu() — an
  // EN array and an FR array, side by side — which is why K6 could flip every
  // locale table in the repo and leave this surface untouched: it was never a
  // table. Seven of the nine locales had no command list at all.
  //
  // Double-quoted and named bot.commands.* on purpose: that is what
  // bot-ternary-sweep.test.js's extractor matches, so these fourteen keys
  // inherit its translation-quality checks (no locale may fall back to or equal
  // the English, placeholder parity, script contamination) rather than needing
  // their own. __tests__/bot-commands.test.js adds what is specific to Telegram.
  //
  // {cuisines} and {hawker} are live Periodical counts read at boot; {n} is
  // SUPPORTED.length. All three go through tn(), so a locale that drops one
  // renders the brace literally — which is what the placeholder-parity check
  // in both guards is there to catch.
  "bot.commands.menu": { en: "Soleat menu hub · one-tap reach to every feature (or /m)", fr: "Hub Soleat · accès rapide à toutes les fonctionnalités (ou /m)", id: "Pusat menu Soleat · semua fitur dalam satu ketukan (atau /m)", ru: "Меню Soleat · все функции в одно касание (или /m)", de: "Soleat-Menü · alle Funktionen mit einem Tipp (oder /m)", zh: "Soleat 菜单中心 · 一键直达所有功能（或 /m）", ja: "Soleat メニューハブ · すべての機能にワンタップ（または /m）", es: "Centro de menú Soleat · todo a un toque (o /m)", ko: "Soleat 메뉴 허브 · 모든 기능을 한 번에 (또는 /m)" },
  "bot.commands.cuisine": { en: "Cuisine Picker · {cuisines} cuisines, SG + Johor Bahru, quick filters (or /c)", fr: "Sélecteur de cuisine · {cuisines} cuisines, SG + Johor Bahru, filtres rapides (ou /c)", id: "Pemilih masakan · {cuisines} masakan, SG + Johor Bahru, filter cepat (atau /c)", ru: "Выбор кухни · {cuisines} кухонь, Сингапур + Джохор-Бару, быстрые фильтры (или /c)", de: "Küchen-Auswahl · {cuisines} Küchen, SG + Johor Bahru, Schnellfilter (oder /c)", zh: "菜系选择器 · {cuisines} 种菜系，新加坡 + 新山，快速筛选（或 /c）", ja: "料理ピッカー · {cuisines} 種の料理、シンガポール + ジョホールバル、クイックフィルター（または /c）", es: "Selector de cocinas · {cuisines} cocinas, SG + Johor Bahru, filtros rápidos (o /c)", ko: "요리 선택기 · {cuisines}개 요리, 싱가포르 + 조호르바루, 빠른 필터 (또는 /c)" },
  "bot.commands.location": { en: "Change location · /location [street] (or /l)", fr: "Changer de lieu · /location [rue] (ou /l)", id: "Ubah lokasi · /location [jalan] (atau /l)", ru: "Сменить место · /location [улица] (или /l)", de: "Ort ändern · /location [Straße] (oder /l)", zh: "更改位置 · /location [街道]（或 /l）", ja: "場所を変更 · /location [通り]（または /l）", es: "Cambiar ubicación · /location [calle] (o /l)", ko: "위치 변경 · /location [거리] (또는 /l)" },
  "bot.commands.hawker": { en: ">{hawker} hawker centres (2026)", fr: "Plus de {hawker} hawker centres (2026)", id: "Lebih dari {hawker} pusat jajan (2026)", ru: "Более {hawker} фуд-центров (2026)", de: "Über {hawker} Hawker-Zentren (2026)", zh: "超过 {hawker} 个熟食中心（2026）", ja: "{hawker} 軒以上のホーカーセンター（2026）", es: "Más de {hawker} centros de hawkers (2026)", ko: "호커센터 {hawker}곳 이상 (2026)" },
  "bot.commands.recognised": { en: "Michelin, Bib Gourmand, Asia 50/100, Local Produce to Table", fr: "Michelin, Bib Gourmand, Asia 50/100, produits locaux", id: "Michelin, Bib Gourmand, Asia 50/100, produk lokal", ru: "Michelin, Bib Gourmand, Asia 50/100, местные продукты", de: "Michelin, Bib Gourmand, Asia 50/100, regionale Produkte", zh: "米其林、必比登、亚洲 50/100、本地食材", ja: "ミシュラン、ビブグルマン、アジア 50/100、地産食材", es: "Michelin, Bib Gourmand, Asia 50/100, producto local", ko: "미쉐린, 빕 구르망, 아시아 50/100, 로컬 식재료" },
  "bot.commands.weather": { en: "Now + 2-hour NEA forecast", fr: "Météo NEA — actuelle + prévision 2 h", id: "Sekarang + prakiraan NEA 2 jam", ru: "Сейчас + прогноз NEA на 2 часа", de: "Jetzt + 2-Stunden-NEA-Prognose", zh: "当前天气 + NEA 两小时预报", ja: "現在 + NEA 2時間予報", es: "Ahora + previsión NEA de 2 horas", ko: "현재 날씨 + NEA 2시간 예보" },
  "bot.commands.transport": { en: "Bus, MRT, walk, drive", fr: "Bus, MRT, marche, voiture", id: "Bus, MRT, jalan kaki, mobil", ru: "Автобус, MRT, пешком, авто", de: "Bus, MRT, zu Fuß, Auto", zh: "巴士、地铁、步行、驾车", ja: "バス、MRT、徒歩、車", es: "Autobús, MRT, a pie, coche", ko: "버스, MRT, 도보, 자동차" },
  "bot.commands.carpark": { en: "Nearest 5 Carpark with available lots", fr: "Les 5 parkings les plus proches", id: "5 tempat parkir terdekat dengan slot tersedia", ru: "5 ближайших парковок со свободными местами", de: "Die 5 nächsten Parkhäuser mit freien Plätzen", zh: "最近 5 个有空位的停车场", ja: "空きのある最寄り駐車場 5 件", es: "Los 5 aparcamientos más cercanos con plazas libres", ko: "빈자리 있는 가까운 주차장 5곳" },
  "bot.commands.search": { en: "Dish / ingredient / technique search · e.g. /search goulash dumpling (or /s)", fr: "Recherche plat / ingrédient / technique · ex. /search goulash quenelles (ou /s)", id: "Cari hidangan / bahan / teknik · mis. /search goulash dumpling (atau /s)", ru: "Поиск блюда / ингредиента / техники · напр. /search goulash dumpling (или /s)", de: "Gericht / Zutat / Technik suchen · z. B. /search goulash dumpling (oder /s)", zh: "菜品 / 食材 / 技法搜索 · 例如 /search goulash dumpling（或 /s）", ja: "料理 / 食材 / 調理法を検索 · 例 /search goulash dumpling（または /s）", es: "Buscar plato / ingrediente / técnica · p. ej. /search goulash dumpling (o /s)", ko: "요리 / 재료 / 조리법 검색 · 예: /search goulash dumpling (또는 /s)" },
  "bot.commands.rating": { en: "Min rating filter · /rating 0–5 (0 = any), shared with Cuisine (or /ra)", fr: "Filtre de note min. · /rating 0–5 (0 = toutes), partagé avec Cuisine (ou /ra)", id: "Filter rating minimum · /rating 0–5 (0 = semua), dipakai bersama Cuisine (atau /ra)", ru: "Фильтр мин. рейтинга · /rating 0–5 (0 = любой), общий с Cuisine (или /ra)", de: "Mindestbewertung · /rating 0–5 (0 = alle), gilt auch für Cuisine (oder /ra)", zh: "最低评分筛选 · /rating 0–5（0 = 不限），与 Cuisine 共用（或 /ra）", ja: "最低評価フィルター · /rating 0–5（0 = 指定なし）、Cuisine と共通（または /ra）", es: "Filtro de nota mínima · /rating 0–5 (0 = todas), compartido con Cuisine (o /ra)", ko: "최소 평점 필터 · /rating 0–5 (0 = 전체), Cuisine과 공용 (또는 /ra)" },
  "bot.commands.clipboard": { en: "📋 Saved cuisine clips · latest from /cuisine Copy-all / per-card Copy (or /clip)", fr: "📋 Clips de cuisine enregistrés · les plus récents depuis /cuisine (ou /clip)", id: "📋 Klip masakan tersimpan · terbaru dari /cuisine (atau /clip)", ru: "📋 Сохранённые клипы кухонь · последние из /cuisine (или /clip)", de: "📋 Gespeicherte Küchen-Clips · zuletzt aus /cuisine (oder /clip)", zh: "📋 已保存的菜系剪贴 · 来自 /cuisine 的最新内容（或 /clip）", ja: "📋 保存した料理クリップ · /cuisine からの最新（または /clip）", es: "📋 Clips de cocina guardados · lo último de /cuisine (o /clip)", ko: "📋 저장된 요리 클립 · /cuisine의 최신 항목 (또는 /clip)" },
  "bot.commands.language": { en: "Switch chat language · {n} languages", fr: "Changer la langue du chat · {n} langues", id: "Ganti bahasa chat · {n} bahasa", ru: "Сменить язык чата · {n} языков", de: "Chat-Sprache wechseln · {n} Sprachen", zh: "切换聊天语言 · {n} 种语言", ja: "チャット言語を切り替え · {n} 言語", es: "Cambiar el idioma del chat · {n} idiomas", ko: "채팅 언어 전환 · {n}개 언어" },
  "bot.commands.privacy": { en: "Data, retention & sources", fr: "Données, conservation et sources", id: "Data, penyimpanan & sumber", ru: "Данные, хранение и источники", de: "Daten, Speicherung & Quellen", zh: "数据、保留期与来源", ja: "データ、保存期間、出典", es: "Datos, conservación y fuentes", ko: "데이터, 보관 기간, 출처" },
  "bot.commands.forgetme": { en: "Erase stored data", fr: "Effacer vos données enregistrées", id: "Hapus data tersimpan", ru: "Удалить сохранённые данные", de: "Gespeicherte Daten löschen", zh: "清除已保存的数据", ja: "保存データを消去", es: "Borrar los datos guardados", ko: "저장된 데이터 삭제" },
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
