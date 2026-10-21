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
  'syntax.wrapper':            { en: 'Re-run this search anytime by tapping or pasting:', fr: 'Relancez cette recherche à tout moment en touchant ou collant :' }
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
