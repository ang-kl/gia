// open-hours.js — v0.57.20
//
// Derive a human "Closed today · Opens tomorrow 11:00 AM" string
// from Google Places `regularOpeningHours.periods`.
//
// Places returns periods as:
//   [{ open:  { day: 0..6, hour: 0..23, minute: 0..59 },
//      close: { day: 0..6, hour: 0..23, minute: 0..59 } }, ...]
//   day 0 = Sunday per Places docs.
// A period that crosses midnight has open.day < close.day. A 24-hour
// venue may be a single period with no close.
//
// All time math runs in Asia/Singapore — SGT is UTC+8 with no DST,
// so a fixed offset is safe.
//
// API:
//   nextOpenString(periods, now = new Date()) -> string | null
//     Returns "Opens today 11:00 AM" / "Opens tomorrow 11:00 AM" /
//     "Opens Mon 11:00 AM". null when periods is missing or never opens.

const SGT_OFFSET_MIN = 8 * 60;

// Returns { day: 0..6, minutes: 0..1439 } in the venue's LOCAL time.
// v0.62.291 — offsetMin = the venue's UTC offset in minutes (Places New
// `utcOffsetMinutes`). Defaults to SGT (UTC+8) so SG venues + legacy 2-arg
// callers are unchanged. For OTHER-region venues (Tokyo, Bangkok, …) the
// caller threads the place's own offset so the day/time math is local-correct.
function localNow(now, offsetMin = SGT_OFFSET_MIN) {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const total = utcMin + offsetMin;
  const dayShift = Math.floor(total / 1440);
  const minutes = ((total % 1440) + 1440) % 1440;
  // JS getUTCDay: 0=Sun..6=Sat; same encoding as Places.
  const day = ((now.getUTCDay() + dayShift) % 7 + 7) % 7;
  return { day, minutes };
}
// Back-compat alias — SGT-fixed wrapper.
function sgtNow(now) { return localNow(now, SGT_OFFSET_MIN); }

// v0.62.305 — locale-aware time. EN keeps the 12-hour "11:00 AM" form
// (tests + chat unchanged); FR + ID use the 24-hour clock per local
// convention — FR "11h00", ID "11.00" (operator: Indonesian = 24-hour).
function fmtTime(hour, minute, lang = 'en') {
  const mm = String(minute || 0).padStart(2, '0');
  if (lang === 'id') return `${String(hour).padStart(2, '0')}.${mm}`;
  if (lang === 'fr') return `${String(hour).padStart(2, '0')}h${mm}`;
  // v0.62.316 — ru + de use the 24-hour clock with a colon (11:00).
  if (lang === 'ru' || lang === 'de' || lang === 'zh' || lang === 'ja' || lang === 'es') return `${String(hour).padStart(2, '0')}:${mm}`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${mm} ${ampm}`;
}

// v0.62.305 — per-locale day abbreviations + open-hours phrase tables.
// EN entries reproduce the prior literals EXACTLY so existing output (and
// the open-hours test suite) is byte-identical; FR + ID added.
const DAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};
function dayLabel(day, lang) { return (DAY_LABELS[lang] || DAY_LABELS.en)[day]; }

const OH_PHRASES = {
  en: {
    opensToday: (t) => `Opens today ${t}`, opensTomorrow: (t) => `Opens tomorrow ${t}`,
    opensDay: (d, t) => `Opens ${d} ${t}`,
    closedNow: 'Closed now', closedToday: 'Closed today', closed: 'Closed',
    open24: 'Open · 24 hours', openPrefix: 'Open',
    closes: (t) => `Closes ${t}`, closesDay: (d, t) => `Closes ${d} ${t}`,
    reopens: (t) => `Reopens ${t}`,
  },
  fr: {
    opensToday: (t) => `Ouvre aujourd'hui ${t}`, opensTomorrow: (t) => `Ouvre demain ${t}`,
    opensDay: (d, t) => `Ouvre ${d} ${t}`,
    closedNow: 'Fermé', closedToday: "Fermé aujourd'hui", closed: 'Fermé',
    open24: 'Ouvert · 24 h', openPrefix: 'Ouvert',
    closes: (t) => `Ferme ${t}`, closesDay: (d, t) => `Ferme ${d} ${t}`,
    reopens: (t) => `Rouvre ${t}`,
  },
  id: {
    opensToday: (t) => `Buka hari ini ${t}`, opensTomorrow: (t) => `Buka besok ${t}`,
    opensDay: (d, t) => `Buka ${d} ${t}`,
    closedNow: 'Tutup sekarang', closedToday: 'Tutup hari ini', closed: 'Tutup',
    open24: 'Buka · 24 jam', openPrefix: 'Buka',
    closes: (t) => `Tutup ${t}`, closesDay: (d, t) => `Tutup ${d} ${t}`,
    reopens: (t) => `Buka lagi ${t}`,
  },
  ru: {
    opensToday: (t) => `Сегодня открывается в ${t}`, opensTomorrow: (t) => `Завтра открывается в ${t}`,
    opensDay: (d, t) => `Открывается ${d} в ${t}`,
    closedNow: 'Сейчас закрыто', closedToday: 'Сегодня закрыто', closed: 'Закрыто',
    open24: 'Открыто · круглосуточно', openPrefix: 'Открыто',
    closes: (t) => `закрывается в ${t}`, closesDay: (d, t) => `закрывается ${d} в ${t}`,
    reopens: (t) => `снова открывается в ${t}`,
  },
  de: {
    opensToday: (t) => `Öffnet heute um ${t}`, opensTomorrow: (t) => `Öffnet morgen um ${t}`,
    opensDay: (d, t) => `Öffnet ${d} um ${t}`,
    closedNow: 'Jetzt geschlossen', closedToday: 'Heute geschlossen', closed: 'Geschlossen',
    open24: 'Geöffnet · 24 Stunden', openPrefix: 'Geöffnet',
    closes: (t) => `schließt um ${t}`, closesDay: (d, t) => `schließt ${d} um ${t}`,
    reopens: (t) => `öffnet wieder um ${t}`,
  },
  zh: {
    opensToday: (t) => `今天 ${t} 开门`, opensTomorrow: (t) => `明天 ${t} 开门`,
    opensDay: (d, t) => `${d} ${t} 开门`,
    closedNow: '现已打烊', closedToday: '今天休息', closed: '休息',
    open24: '营业 · 24 小时', openPrefix: '营业中',
    closes: (t) => `${t} 打烊`, closesDay: (d, t) => `${d} ${t} 打烊`,
    reopens: (t) => `${t} 重新开门`,
  },
  ja: {
    opensToday: (t) => `本日 ${t} 開店`, opensTomorrow: (t) => `明日 ${t} 開店`,
    opensDay: (d, t) => `${d} ${t} 開店`,
    closedNow: '現在閉店', closedToday: '本日休業', closed: '休業',
    open24: '営業中 · 24時間', openPrefix: '営業中',
    closes: (t) => `${t} 閉店`, closesDay: (d, t) => `${d} ${t} 閉店`,
    reopens: (t) => `${t} 再開`,
  },
  es: {
    opensToday: (t) => `Abre hoy ${t}`, opensTomorrow: (t) => `Abre mañana ${t}`,
    opensDay: (d, t) => `Abre ${d} ${t}`,
    closedNow: 'Cerrado ahora', closedToday: 'Cerrado hoy', closed: 'Cerrado',
    open24: 'Abierto · 24 horas', openPrefix: 'Abierto',
    closes: (t) => `Cierra ${t}`, closesDay: (d, t) => `Cierra ${d} ${t}`,
    reopens: (t) => `Reabre ${t}`,
  },

  // v0.62.883 (K6) — Korean is verb-final, so these are written to that order rather
  // than re-ordered from English: the time comes first and the verb closes the phrase,
  // as in ja. OH_LANGS is derived from this table's keys, so adding the block is what
  // makes every caller — the Michelin path included — start speaking Korean.
  ko: {
    opensToday: (t) => `오늘 ${t} 영업 시작`, opensTomorrow: (t) => `내일 ${t} 영업 시작`,
    opensDay: (d, t) => `${d} ${t} 영업 시작`,
    closedNow: '지금 영업 종료', closedToday: '오늘 휴무', closed: '휴무',
    open24: '영업 중 · 24시간', openPrefix: '영업 중',
    closes: (t) => `${t} 영업 종료`, closesDay: (d, t) => `${d} ${t} 영업 종료`,
    reopens: (t) => `${t} 영업 재개`,
  },
};
function phrases(lang) { return OH_PHRASES[lang] || OH_PHRASES.en; }

// v0.62.825 — the locales these helpers can actually speak, DERIVED from the
// phrase table rather than hand-listed. Every caller that used to write its own
// `lang === 'fr' ? 'fr' : 'en'` was a second copy of this list, and every copy
// drifted: index.js's Michelin path spoke two of the eight while this table held
// all eight, so a Japanese reader got "Closed today · Opens Sun 11:30 AM" from a
// module that had 本日休業 written in it. Callers now ask; nobody re-lists.
const OH_LANGS = Object.keys(OH_PHRASES);
function ohLang(lang) {
  const two = String(lang || '').slice(0, 2).toLowerCase();
  return OH_LANGS.includes(two) ? two : 'en';
}

// v0.62.305 — internal: returns { delta, time, day, text } so callers can
// branch on `delta` (e.g. "Closed now" vs "Closed today") WITHOUT re-parsing
// a now-localised string. `nextOpenString` wraps this for back-compat.
function nextOpenInfo(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN, lang = 'en') {
  if (!Array.isArray(periods) || !periods.length) return null;

  const cur = localNow(now, offsetMin);

  // Build (dayDelta, openTime) candidates for the next 7 days.
  // dayDelta 0 = today; we only consider future opens (open in future today,
  // or any open on dayDelta 1..6).
  let best = null;
  for (let delta = 0; delta < 7; delta += 1) {
    const targetDay = (cur.day + delta) % 7;
    for (const pd of periods) {
      const o = pd?.open;
      if (!o || typeof o.day !== 'number') continue;
      if (o.day !== targetDay) continue;
      const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
      if (delta === 0 && openMin <= cur.minutes) continue;
      if (!best || delta < best.delta || (delta === best.delta && openMin < best.openMin)) {
        best = { delta, openMin, hour: o.hour ?? 0, minute: o.minute ?? 0, day: targetDay };
      }
    }
    if (best && best.delta === delta) break;
  }

  if (!best) return null;
  const P = phrases(lang);
  const time = fmtTime(best.hour, best.minute, lang);
  // v0.62.489 — operator: "today"/"tomorrow" is ambiguous across time zones
  // (a venue's local "today" can be the user's yesterday/tomorrow — the
  // Wellington report). Always name the weekday instead ("Opens Sat 11:30 AM"),
  // which is unambiguous whoever's reading and in whichever zone. The delta is
  // still returned so closedTodayString can pick "Closed now" vs "Closed today".
  const text = P.opensDay(dayLabel(best.day, lang), time);
  return { delta: best.delta, time, day: best.day, text };
}

// v0.62.467 — operator: for a venue CLOSED NOW but reopening later TODAY, the
// result strip shows "Closed Now · Open in N min" (≤99 min) or
// "Closed Now · Opens hh:mm ~ hh:mm" (later today). Returns the minutes until
// the next same-day open + that open period's start~end times. null when the
// venue does not reopen again today (→ caller falls back to plain "Closed").
function reopenTodayInfo(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN, lang = 'en') {
  if (!Array.isArray(periods) || !periods.length) return null;
  const cur = localNow(now, offsetMin);
  let best = null;
  for (const pd of periods) {
    const o = pd?.open;
    const c = pd?.close;
    if (!o || typeof o.day !== 'number') continue;
    if (o.day !== cur.day) continue;                 // today only
    const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
    if (openMin <= cur.minutes) continue;            // future opens only
    if (!best || openMin < best.openMin) {
      best = { openMin, oHour: o.hour ?? 0, oMin: o.minute ?? 0, cHour: c?.hour, cMin: c?.minute, hasClose: !!c && typeof c.hour === 'number' };
    }
  }
  if (!best) return null;
  return {
    minutesUntilOpen: best.openMin - cur.minutes,
    openStart: fmtTime(best.oHour, best.oMin, lang),
    openEnd: best.hasClose ? fmtTime(best.cHour, best.cMin, lang) : null,
  };
}

function nextOpenString(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN, lang = 'en') {
  const info = nextOpenInfo(periods, now, offsetMin, lang);
  return info ? info.text : null;
}

// closedTodayString — returns the user-facing closed-today line for
// a venue that's currently closed. Combines "Closed now"/"Closed today"
// with the next-open hint when available.
//
// v0.61.219 — operator: "Closed today" is misleading when the venue
// re-opens later the same day. Switch the prefix:
//   next opens TODAY     → "Closed now · Opens today 11:30 AM"
//   next opens tomorrow+ → "Closed today · Opens tomorrow 11:00 AM"
function closedTodayString(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN, lang = 'en') {
  const P = phrases(lang);
  const info = nextOpenInfo(periods, now, offsetMin, lang);
  if (!info) return P.closed;
  const prefix = info.delta === 0 ? P.closedNow : P.closedToday;
  return `${prefix} · ${info.text}`;
}

// v0.61.246 — operator: "if currently is open, state the closing time
// like what time and next open (especially for resturants that have
// fix lunch and dinner timing)."
//
// Returns the user-facing current-open line:
//   single same-day period      → "Open · Closes 10:00 PM"
//   split (lunch + dinner)      → "Open · Closes 3:00 PM · Reopens 6:00 PM"
//   period crosses midnight     → "Open · Closes Tue 2:00 AM" (best-effort)
//   no current period           → null
//
// Algorithm:
//   1. Find the current period — one whose [open, close] interval
//      contains `now` in SGT minutes. Midnight crossers are handled
//      by treating close-day shift as +24h on the close side.
//   2. Look for a same-day reopen — another period today whose open
//      is strictly after the current period's close.
//   3. Format the close time + (if reopen) the reopen time.
function currentOpenString(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN, lang = 'en') {
  if (!Array.isArray(periods) || !periods.length) return null;
  const cur = localNow(now, offsetMin);

  // Find the current period in SGT.
  let active = null;
  for (const pd of periods) {
    const o = pd?.open;
    const c = pd?.close;
    if (!o || typeof o.day !== 'number') continue;
    const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
    // 24-hour venue: no close → permanently open
    if (!c) {
      if (o.day === cur.day || cur.day === (o.day + 1) % 7) {
        return phrases(lang).open24;
      }
      continue;
    }
    const closeMin = (c.hour ?? 0) * 60 + (c.minute ?? 0);
    // Same-day period — open.day === today AND open<=now<close
    if (o.day === cur.day && c.day === cur.day) {
      if (openMin <= cur.minutes && cur.minutes < closeMin) {
        active = { period: pd, sameDayClose: true, openMin, closeMin, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
    // Midnight-crosser starting today, closing on the next day.
    if (o.day === cur.day && c.day === (o.day + 1) % 7) {
      if (cur.minutes >= openMin) {
        active = { period: pd, sameDayClose: false, openMin, closeMin: closeMin + 1440, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
    // Midnight-crosser opened yesterday, still closing today.
    if (o.day === (cur.day + 6) % 7 && c.day === cur.day) {
      if (cur.minutes < closeMin) {
        active = { period: pd, sameDayClose: false, openMin: openMin - 1440, closeMin, closeHour: c.hour ?? 0, closeMinute: c.minute ?? 0, closeDay: c.day };
        break;
      }
      continue;
    }
  }

  if (!active) return null;

  // Look for a same-day reopen — a period whose open.day === today AND
  // openMin > current period's closeMin (relative to today's minutes).
  // Only meaningful when the current period closes today (not on a
  // midnight-crosser that closes tomorrow).
  let reopen = null;
  if (active.sameDayClose) {
    for (const pd of periods) {
      const o = pd?.open;
      if (!o || typeof o.day !== 'number') continue;
      if (o.day !== cur.day) continue;
      const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
      if (openMin > active.closeMin) {
        if (!reopen || openMin < reopen.openMin) {
          reopen = { openMin, hour: o.hour ?? 0, minute: o.minute ?? 0 };
        }
      }
    }
  }

  const P = phrases(lang);
  const closeFmt = fmtTime(active.closeHour, active.closeMinute, lang);
  // Midnight-crosser closing on the next day surfaces the day label so
  // the user isn't surprised by an early-morning AM time.
  const sameDay = active.sameDayClose || active.closeDay === cur.day;
  const closePart = sameDay ? P.closes(closeFmt) : P.closesDay(dayLabel(active.closeDay, lang), closeFmt);
  if (reopen) {
    return `${P.openPrefix} · ${closePart} · ${P.reopens(fmtTime(reopen.hour, reopen.minute, lang))}`;
  }
  return `${P.openPrefix} · ${closePart}`;
}

// v0.62.466 — operator: flag venues closing within the hour on the result
// card ("Closing in ## minutes"), and sort closed venues to the end of the
// list. Mirrors currentOpenString's active-period lookup but returns the
// raw minute count instead of a formatted string.
function minutesUntilClose(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const cur = localNow(now, offsetMin);
  for (const pd of periods) {
    const o = pd?.open;
    const c = pd?.close;
    if (!o || typeof o.day !== 'number' || !c) continue; // 24h venues (no close) never "close soon"
    const openMin = (o.hour ?? 0) * 60 + (o.minute ?? 0);
    const closeMin = (c.hour ?? 0) * 60 + (c.minute ?? 0);
    // Same-day period.
    if (o.day === cur.day && c.day === cur.day) {
      if (openMin <= cur.minutes && cur.minutes < closeMin) return closeMin - cur.minutes;
      continue;
    }
    // Midnight-crosser starting today.
    if (o.day === cur.day && c.day === (o.day + 1) % 7) {
      if (cur.minutes >= openMin) return (closeMin + 1440) - cur.minutes;
      continue;
    }
    // Midnight-crosser opened yesterday, still closing today.
    if (o.day === (cur.day + 6) % 7 && c.day === cur.day) {
      if (cur.minutes < closeMin) return closeMin - cur.minutes;
      continue;
    }
  }
  return null;
}

// ── v0.62.827 — every locale at once, for the client to pick from ─────────
//
// TIER 1 of the on-the-fly re-localisation plan. The Mini App's language toggle
// is React state: `useLocale()` re-renders the whole tree, so every `t(key, lang)`
// string switches the instant it is tapped. What did NOT switch was anything the
// server had already rendered into a string — and the hours line is the one such
// field that is pure computation over data we already hold.
//
// WHAT WAS TRIED FIRST AND FAILED, recorded so nobody repeats it. The plan put to
// the operator was to ship the INPUTS (`periods` + `utcOffsetMinutes`, which the
// server currently deletes) and import this module into the TMA from
// `web/_shared/lib/`. Measured: Rollup refuses it —
//   "ohLang" is not exported by "../../open-hours.js"
// because the root package is CommonJS and `web/cuisine` is `"type": "module"`.
// Making this file ESM would move the break to the four CJS server call sites and
// its own test; keeping two implementations is the drift O-335 was about.
//
// So the labels are rendered here, once per locale, and the client picks. It costs
// 374 bytes a venue, measured on a real label set — LESS than the 561 bytes the
// periods would have cost. It needs no module sharing and duplicates no logic, and
// the locales come from OH_LANGS, so this cannot be a fifth hand-copied list.
//
// WHAT THIS DOES NOT FIX, stated rather than implied: the labels are still computed
// at SEARCH time, so they age as the evening passes exactly as today's single label
// does. Client-side formatting would have fixed that too; the bundler decided.
function _byLang(fn, periods, now, offsetMin) {
  const out = {};
  for (const l of OH_LANGS) {
    const s = fn(periods, now, offsetMin, l);
    if (s) out[l] = s;
  }
  return out;
}
function closedTodayByLang(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN) {
  return _byLang(closedTodayString, periods, now, offsetMin);
}
function currentOpenByLang(periods, now = new Date(), offsetMin = SGT_OFFSET_MIN) {
  return _byLang(currentOpenString, periods, now, offsetMin);
}

module.exports = {
  OH_LANGS,
  ohLang,
  closedTodayByLang,
  currentOpenByLang,
  nextOpenString,
  closedTodayString,
  currentOpenString,
  minutesUntilClose,
  reopenTodayInfo,
  localNow,
  sgtNow,
  fmtTime,
  SGT_OFFSET_MIN
};
